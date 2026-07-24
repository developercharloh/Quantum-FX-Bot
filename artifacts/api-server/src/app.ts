import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // managed per-app in the React builds
  crossOriginEmbedderPolicy: false,
}));

// ── CORS — only allow the production domain (+ localhost for dev) ─────────────
const allowedOrigins = [
  "https://quantum-fx-bot.site",
  "https://www.quantum-fx-bot.site",
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:18900", "http://localhost:18391"] : []),
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("CORS policy violation"));
  },
  credentials: true,
}));

// ── Rate limiting on auth routes ──────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.path === "/api/healthz",
});
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again in an hour." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", strictLimiter);
app.use("/api/auth/verify-otp", authLimiter);

// Ultra-simple health check before any middleware — responds instantly even if
// pinoHttp or static-file middleware is slow to initialize on cold start.
app.get("/api/healthz", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.end('{"status":"ok"}');
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({
  verify: (_req, _res, buf) => {
    (_req as any).rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);


// Keep API failures machine-readable for the frontend instead of Express's
// default HTML error page.
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, "Unhandled API error");
  if (req.path.startsWith("/api")) {
    return res.status(500).json({ error: "Internal server error" });
  }
  return next(err);
});

// Single-service deployments (e.g. Render) serve the built React app from the
// same Express server. Gated behind SERVE_CLIENT so Replit's split
// frontend/backend setup (shared reverse proxy) is unaffected.
if (process.env.SERVE_CLIENT === "true") {
  const clientDist = path.resolve(
    process.cwd(),
    process.env.CLIENT_DIST ?? "artifacts/quantum-fx-bot/dist/public",
  );

  app.use(express.static(clientDist));

  // SPA fallback: non-API, non-admin-app GET requests return index.html.
  // Must exclude /admin-app/* so the admin panel's own static files (sw.js,
  // assets, etc.) are not shadowed by this fallback.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/admin-app")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });

  logger.info({ clientDist }, "Serving frontend static assets");
}

// Serve the admin panel from /admin-app/ on the same server.
// Bypasses the unreliable Render static site builder entirely.
// The dist is committed to the repo so no separate build step is needed.
if (process.env.SERVE_ADMIN === "true") {
  const adminDist = path.resolve(
    process.cwd(),
    process.env.ADMIN_DIST ?? "artifacts/admin-app/dist/public",
  );

  // Serve static assets prefixed at /admin-app
  app.use("/admin-app", express.static(adminDist));

  // SPA fallback: non-file requests under /admin-app return index.html.
  // Express 5 does not allow bare wildcards in get(); use middleware instead.
  app.use("/admin-app", (_req, res) => {
    res.sendFile(path.join(adminDist, "index.html"));
  });

  logger.info({ adminDist }, "Serving admin panel static assets");
}

export default app;
