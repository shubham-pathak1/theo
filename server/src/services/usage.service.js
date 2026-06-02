import { redis } from "../config/redis.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const limits = {
  free: { messages: 25, images: 5 },
  pro: { messages: 250, images: 50 },
  max: { messages: 1000, images: 200 }
};

const memoryUsage = new Map();

function windowInfo(date = new Date()) {
  const windowMs = env.USAGE_WINDOW_HOURS * 60 * 60 * 1000;
  const startMs = Math.floor(date.getTime() / windowMs) * windowMs;
  const endMs = startMs + windowMs;

  return {
    key: new Date(startMs).toISOString(),
    resetAt: new Date(endMs),
    ttlSeconds: Math.max(1, Math.ceil((endMs - date.getTime()) / 1000))
  };
}

export function planLimits(plan = "free") {
  return limits[plan] || limits.free;
}

export async function getUsage(userId, plan = "free") {
  const window = windowInfo();
  const messageKey = `usage:${userId}:${window.key}:messages`;
  const imageKey = `usage:${userId}:${window.key}:images`;
  let messages = 0;
  let images = 0;

  try {
    if (redis?.status !== "ready") {
      throw new Error("Redis not ready");
    }
    [messages, images] = await redis.mget(messageKey, imageKey);
  } catch {
    messages = memoryUsage.get(messageKey) || 0;
    images = memoryUsage.get(imageKey) || 0;
  }

  return {
    window: window.key,
    resetAt: window.resetAt,
    limits: planLimits(plan),
    used: {
      messages: Number(messages || 0),
      images: Number(images || 0)
    }
  };
}

export async function consumeUsage(user, kind) {
  const allowed = planLimits(user.plan)[kind];
  const window = windowInfo();
  const key = `usage:${user.id}:${window.key}:${kind}`;
  let used;

  try {
    if (redis?.status !== "ready") {
      throw new Error("Redis not ready");
    }
    used = await redis.incr(key);
    if (used === 1) {
      await redis.expire(key, window.ttlSeconds);
    }
  } catch {
    used = (memoryUsage.get(key) || 0) + 1;
    memoryUsage.set(key, used);
  }

  if (used > allowed) {
    try {
      await redis?.decr(key);
    } catch {
      memoryUsage.set(key, Math.max(0, used - 1));
    }
    throw new ApiError(429, `${env.USAGE_WINDOW_HOURS}-hour ${kind} limit reached for ${user.plan} plan`);
  }

  return { used, limit: allowed, resetAt: window.resetAt };
}
