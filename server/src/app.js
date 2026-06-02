import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { billingRouter } from "./routes/billing.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { galleryRouter } from "./routes/gallery.routes.js";
import { imageRouter } from "./routes/image.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(compression());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true
    })
  );
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buffer) => {
        if (req.originalUrl === "/api/billing/webhook") {
          req.rawBody = buffer;
        }
      }
    })
  );
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, name: "theo-api" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/images", imageRouter);
  app.use("/api/gallery", galleryRouter);
  app.use("/api/billing", billingRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
