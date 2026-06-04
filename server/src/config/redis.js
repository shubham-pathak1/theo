import IORedis from "ioredis";
import { env } from "./env.js";

export const redis = env.ENABLE_REDIS && env.REDIS_URL
  ? new IORedis(env.REDIS_URL, {
      connectTimeout: 10000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        return Math.min(times * 250, 3000);
      }
    })
  : null;

let loggedUnavailable = false;

redis?.on("error", (error) => {
  if (loggedUnavailable) return;
  loggedUnavailable = true;
  console.warn("Redis unavailable, using local fallbacks:", error.message);
});

redis?.on("ready", () => {
  loggedUnavailable = false;
});

export async function connectRedis() {
  if (!redis) return false;

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    await redis.ping();
    return true;
  } catch (error) {
    if (!loggedUnavailable) {
      loggedUnavailable = true;
      console.warn("Redis unavailable, using local fallbacks:", error.message);
    }
    return false;
  }
}
