import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  SERVER_URL: z.string().url().default("http://localhost:5000"),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/theo"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  JWT_ACCESS_SECRET: z.string().default("dev-access-secret"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret"),
  COOKIE_SECRET: z.string().default("dev-cookie-secret"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_TEXT_MODEL: z.string().default("gemini-1.5-flash"),
  GEMINI_IMAGE_MODEL: z.string().default("imagen-4.0-generate-001"),
  THEO_MODEL_LOW: z.string().default("gemini-1.5-flash"),
  THEO_MODEL_MEDIUM: z.string().default("gemini-1.5-flash"),
  THEO_MODEL_HIGH: z.string().default("gemini-1.5-pro"),
  THEO_MODEL_XHIGH: z.string().default("gemini-1.5-pro"),
  THEO_CONTEXT_RECENT_MESSAGES: z.coerce.number().default(12),
  THEO_COMPACT_AFTER_MESSAGES: z.coerce.number().default(18),
  USAGE_WINDOW_HOURS: z.coerce.number().default(5),
  DEMO_MODE: z.coerce.boolean().default(false),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().default("Theo <noreply@theo.local>")
});

export const env = envSchema.parse(process.env);
