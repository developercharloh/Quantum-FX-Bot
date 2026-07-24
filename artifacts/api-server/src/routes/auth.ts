import { Router } from "express";
import { db, usersTable, sessionsTable, notificationSettingsTable, kycTable, emailOtpsTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import crypto from "crypto";
import { verifySync } from "otplib";
import { notifyUserLogin } from "../lib/loginAlarm";
import { sendPushToAllAdmins } from "../lib/webPush";
import { sendOtpEmail } from "../lib/mailer";
import { logger } from "../lib/logger";
import {
  RegisterBody,
  LoginBody,
  ForgotPasswordBody,
  ResetPasswordBody,
} from "@workspace/api-zod";

// In-memory store for pending 2FA logins (tempToken → { userId, expires })
const pending2FA = new Map<string, { userId: number; expires: number }>();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createAndSendOtp(email: string, userId: number, purpose: "register" | "login"): Promise<void> {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await db.insert(emailOtpsTable).values({ email, otp, userId, expiresAt });
  // Send email in the background — don't block the response
  void sendOtpEmail(email, otp, purpose).catch(() => {});
}
// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pending2FA) {
    if (v.expires < now) pending2FA.delete(k);
  }
}, 5 * 60 * 1000);

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "quantum_salt_2024").digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateAccountUid(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let uid = "QFX";
  for (let i = 0; i < 8; i++) uid += chars[Math.floor(Math.random() * chars.length)];
  return uid;
}

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function getUserAgent(req: any): string {
  const ua = req.headers["user-agent"] || "Unknown";
  if (ua.includes("Mobile")) return "Mobile Browser";
  if (ua.includes("Chrome")) return "Chrome Browser";
  if (ua.includes("Firefox")) return "Firefox Browser";
  if (ua.includes("Safari")) return "Safari Browser";
  return "Web Browser";
}

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { fullName, email, password, referralCode } = parsed.data;

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    return res.status(400).json({ error: "Email already registered" });
  }

  let referredById: number | null = null;
  if (referralCode) {
    const referrer = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referralCode, referralCode)).limit(1);
    if (referrer.length > 0) {
      referredById = referrer[0].id;
    }
  }

  const [user] = await db.insert(usersTable).values({
    accountUid: generateAccountUid(),
    fullName,
    email,
    passwordHash: hashPassword(password),
    referralCode: generateReferralCode(),
    referredById: referredById ?? undefined,
    kycStatus: "not_verified",
    twoFAEnabled: false,
  }).returning();

  // Init notification settings and KYC
  await db.insert(notificationSettingsTable).values({
    userId: user.id,
    emailNotifications: true,
    botAlerts: true,
    depositWithdrawal: true,
    promotions: false,
  });
  await db.insert(kycTable).values({ userId: user.id, status: "not_submitted" });

  // Send email OTP — user must verify before getting a session
  await createAndSendOtp(email, user.id, "register");

  return res.status(201).json({ requiresEmailVerification: true, email });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { email, password } = parsed.data;

  // Keep credential lookup compatible while an older production database is
  // applying the optional otp_bypass migration. Selecting the whole row would
  // fail before we can return a normal auth response if that column is absent.
  const users = await db.select({
    id: usersTable.id,
    accountUid: usersTable.accountUid,
    fullName: usersTable.fullName,
    email: usersTable.email,
    passwordHash: usersTable.passwordHash,
    avatarUrl: usersTable.avatarUrl,
    kycStatus: usersTable.kycStatus,
    status: usersTable.status,
    twoFAEnabled: usersTable.twoFAEnabled,
    twoFASecret: usersTable.twoFASecret,
    referralCode: usersTable.referralCode,
    referredById: usersTable.referredById,
    createdAt: usersTable.createdAt,
    updatedAt: usersTable.updatedAt,
  }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (users.length === 0 || users[0].passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const user = users[0];

  if (user.status === "suspended") {
    return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
  }

  // Read the optional bypass flag separately so older production schemas can
  // still authenticate while their migration catches up.
  let otpBypass = false;
  try {
    const [flags] = await db.select({ otpBypass: usersTable.otpBypass })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);
    otpBypass = Boolean(flags?.otpBypass);
  } catch (error) {
    logger.warn({ error }, "otp_bypass column unavailable; continuing with email verification");
  }

  // If this user has OTP bypass enabled, create session immediately
  if (otpBypass) {
    const token = generateToken();
    await db.insert(sessionsTable).values({
      userId: user.id,
      token,
      device: getUserAgent(req),
      ip: (req.ip || "0.0.0.0").replace("::ffff:", ""),
      location: "Unknown",
    });
    void (async () => {
      try {
        const ip = (req.ip ?? "0.0.0.0").replace("::ffff:", "");
        let country = "Unknown";
        try {
          if (ip !== "0.0.0.0" && ip !== "127.0.0.1" && !ip.startsWith("::1")) {
            const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country,status`);
            const geoJson = await geo.json() as { status?: string; country?: string };
            if (geoJson.status === "success" && geoJson.country) country = geoJson.country;
          }
        } catch { /* geo lookup failed */ }
        await notifyUserLogin({ userId: user.id, accountUid: user.accountUid, name: user.fullName, email: user.email, ip, country });
        await sendPushToAllAdmins({ title: "🔐 User Login", body: `${user.fullName} (${user.email}) logged in · ${country}`, tag: "qfx-login", data: { type: "login", userId: user.id } });
      } catch { /* notification failed */ }
    })();
    return res.json({
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, avatarUrl: user.avatarUrl, kycStatus: user.kycStatus, createdAt: user.createdAt.toISOString() },
    });
  }

  // Send email OTP — user must verify before getting a session
  await createAndSendOtp(user.email, user.id, "login");
  return res.json({ requiresEmailVerification: true, email: user.email });
});

// Verify email OTP (used by both registration and login flows)
router.post("/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required." });

  const now = new Date();
  const rows = await db
    .select()
    .from(emailOtpsTable)
    .where(
      and(
        eq(emailOtpsTable.email, email),
        eq(emailOtpsTable.otp, String(otp)),
        gt(emailOtpsTable.expiresAt, now),
        isNull(emailOtpsTable.usedAt)
      )
    )
    .orderBy(emailOtpsTable.createdAt)
    .limit(1);

  if (rows.length === 0) {
    return res.status(401).json({ error: "Invalid or expired code. Please try again." });
  }

  const otpRow = rows[0];
  // Mark OTP as used
  await db.update(emailOtpsTable).set({ usedAt: now }).where(eq(emailOtpsTable.id, otpRow.id));

  const users = await db.select({
    id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email,
    avatarUrl: usersTable.avatarUrl, kycStatus: usersTable.kycStatus,
    twoFAEnabled: usersTable.twoFAEnabled, twoFASecret: usersTable.twoFASecret,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, otpRow.userId!)).limit(1);
  if (users.length === 0) return res.status(401).json({ error: "User not found." });
  const user = users[0];

  // If 2FA is enabled, return a temp token for the next step
  if (user.twoFAEnabled && user.twoFASecret) {
    const tempToken = crypto.randomBytes(24).toString("hex");
    pending2FA.set(tempToken, { userId: user.id, expires: Date.now() + 5 * 60 * 1000 });
    return res.json({ requires2FA: true, tempToken });
  }

  const token = generateToken();
  await db.insert(sessionsTable).values({
    userId: user.id,
    token,
    device: getUserAgent(req),
    ip: (req.ip || "0.0.0.0").replace("::ffff:", ""),
    location: "Unknown",
  });

  // Notify admin (fire-and-forget)
  void (async () => {
    try {
      const ip = (req.ip ?? "0.0.0.0").replace("::ffff:", "");
      let country = "Unknown";
      try {
        if (ip !== "0.0.0.0" && ip !== "127.0.0.1" && !ip.startsWith("::1")) {
          const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country,status`);
          const geoJson = await geo.json() as { status?: string; country?: string };
          if (geoJson.status === "success" && geoJson.country) country = geoJson.country;
        }
      } catch { /* geo lookup failed */ }
      await notifyUserLogin({ userId: user.id, accountUid: (user as any).accountUid ?? '', name: user.fullName, email: user.email, ip, country });
      await sendPushToAllAdmins({ title: "🔐 User Login", body: `${user.fullName} (${user.email}) logged in · ${country}`, tag: "qfx-login", data: { type: "login", userId: user.id } });
    } catch { /* notification failed */ }
  })();

  return res.json({
    token,
    user: { id: user.id, fullName: user.fullName, email: user.email, avatarUrl: user.avatarUrl, kycStatus: user.kycStatus, createdAt: user.createdAt.toISOString() },
  });
});

// Resend OTP
router.post("/auth/resend-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  const users = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (users.length === 0) return res.status(404).json({ error: "No account found with that email." });

  await createAndSendOtp(email, users[0].id, "login");
  return res.json({ message: "A new code has been sent to your email." });
});

// Verify 2FA code after password login
router.post("/auth/2fa/verify", async (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) return res.status(400).json({ error: "Missing tempToken or code" });

  const pending = pending2FA.get(tempToken);
  if (!pending || pending.expires < Date.now()) {
    pending2FA.delete(tempToken);
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }

  const users = await db.select({
    id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email,
    avatarUrl: usersTable.avatarUrl, kycStatus: usersTable.kycStatus,
    twoFAEnabled: usersTable.twoFAEnabled, twoFASecret: usersTable.twoFASecret,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, pending.userId)).limit(1);
  if (users.length === 0) return res.status(401).json({ error: "User not found" });
  const user = users[0];

  if (!user.twoFASecret || !verifySync({ token: code, secret: user.twoFASecret }).valid) {
    return res.status(401).json({ error: "Invalid 2FA code" });
  }

  pending2FA.delete(tempToken);
  const token = generateToken();
  await db.insert(sessionsTable).values({
    userId: user.id,
    token,
    device: getUserAgent(req),
    ip: (req.ip || "0.0.0.0").replace("::ffff:", ""),
    location: "Unknown",
  });

  return res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  return res.json({ message: "Logged out successfully" });
});

router.post("/auth/forgot-password", async (req, res) => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  // In production this would send an email. We just return success.
  return res.json({ message: "Password reset link sent to your email" });
});

router.post("/auth/reset-password", async (req, res) => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  // In production, verify token and update password
  return res.json({ message: "Password reset successfully" });
});

router.get("/auth/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
  if (sessions.length === 0) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const users = await db.select({
    id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email,
    avatarUrl: usersTable.avatarUrl, kycStatus: usersTable.kycStatus,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, sessions[0].userId)).limit(1);
  if (users.length === 0) {
    return res.status(401).json({ error: "User not found" });
  }
  const user = users[0];

  // Fetch accountUid separately — column added in migration 0005; may be absent
  // on older production databases before migration 0014 runs.
  let accountUid: string | null = null;
  try {
    const [extra] = await db.select({ accountUid: usersTable.accountUid })
      .from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    accountUid = extra?.accountUid ?? null;
  } catch { /* column not yet present */ }

  return res.json({
    id: user.id,
    accountUid,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    kycStatus: user.kycStatus,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
