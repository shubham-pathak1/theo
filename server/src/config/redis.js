import IORedis from "ioredis";
import { env } from "./env.js";

export const redis = env.REDIS_URL
  ? new IORedis(env.REDIS_URL, {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: null
    })
  : null;

redis?.on("error", (error) => {
  console.warn("Redis unavailable, using local fallbacks:", error.message);
});

export async function connectRedis() {
  if (!redis) return false;

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
