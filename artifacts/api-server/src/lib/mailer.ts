import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(
  email: string,
  otp: string,
  purpose: "register" | "login"
): Promise<void> {
  const isRegister = purpose === "register";
  const subject = isRegister
    ? "Verify your Quantum FX Bot account"
    : "Your Quantum FX Bot login code";

  await transporter.sendMail({
    from: `"Quantum FX Bot" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to: email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d1117;color:#fff;padding:40px 32px;border-radius:16px;border:1px solid #1e2530;">
        <h2 style="margin:0 0 8px;font-size:22px;color:#a855f7;">Quantum FX Bot</h2>
        <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;">
          ${isRegister ? "Welcome! Verify your email to activate your account." : "Use the code below to complete your login."}
        </p>
        <div style="background:#161d27;border:1px solid #2d3748;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">Your verification code</p>
          <div style="font-size:42px;font-weight:700;letter-spacing:12px;color:#a855f7;font-family:monospace;">${otp}</div>
        </div>
        <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
          This code expires in <strong style="color:#9ca3af;">10 minutes</strong>. Never share it with anyone.
        </p>
      </div>
    `,
  });
}
