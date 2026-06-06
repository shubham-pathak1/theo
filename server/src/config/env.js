import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const envBoolean = (defaultValue = false) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    return value;
  }, z.boolean().default(defaultValue));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  SERVER_URL: z.string().url().default("http://localhost:5000"),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/theo"),
  REDIS_URL: z.string().optional().default(""),
  ENABLE_REDIS: envBoolean(false),
  START_WORKER: envBoolean(true),
  IMAGE_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  IMAGE_QUEUE_ATTEMPTS: z.coerce.number().int().positive().default(3),
  IMAGE_QUEUE_BACKOFF_MS: z.coerce.number().int().positive().default(5000),
  LOCAL_UPLOAD_RETENTION_DAYS: z.coerce.number().int().positive().default(14),
  JWT_ACCESS_SECRET: z.string().default("dev-access-secret"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret"),
  COOKIE_SECRET: z.string().default("dev-cookie-secret"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  IMAGE_PROVIDER: z.enum(["cloudflare", "gemini", "demo"]).default("demo"),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional().default(""),
  CLOUDFLARE_API_TOKEN: z.string().optional().default(""),
  CLOUDFLARE_IMAGE_MODEL: z.string().default("@cf/stabilityai/stable-diffusion-xl-base-1.0"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_TEXT_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_IMAGE_MODEL: z.string().default("imagen-4.0-generate-001"),
  THEO_MODEL_LOW: z.string().default("gemini-2.5-flash-lite"),
  THEO_MODEL_MEDIUM: z.string().default("gemini-2.5-flash"),
  THEO_MODEL_HIGH: z.string().default("gemini-3.5-flash"),
  THEO_MODEL_XHIGH: z.string().default("gemini-3.5-flash"),
  THEO_CONTEXT_RECENT_MESSAGES: z.coerce.number().default(12),
  THEO_COMPACT_AFTER_MESSAGES: z.coerce.number().default(18),
  USAGE_WINDOW_HOURS: z.coerce.number().default(5),
  DEMO_MODE: envBoolean(false),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().default("Theo <noreply@theo.local>")
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  RAZORPAY_KEY_SECRET: parsedEnv.RAZORPAY_KEY_SECRET || parsedEnv.RAZORPAY_SECRET
};
