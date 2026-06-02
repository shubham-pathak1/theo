import { Queue } from "bullmq";
import { redis } from "../config/redis.js";

export const imageQueue = redis
  ? new Queue("image-generation", {
      connection: redis
    })
  : null;
