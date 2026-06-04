import { Queue } from "bullmq";
import { redis } from "../config/redis.js";
import { env } from "../config/env.js";

export const imageQueue = redis
  ? new Queue("image-generation", {
      connection: redis,
      defaultJobOptions: {
        attempts: env.IMAGE_QUEUE_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: env.IMAGE_QUEUE_BACKOFF_MS
        },
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 100
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7,
          count: 300
        }
      }
    })
  : null;
