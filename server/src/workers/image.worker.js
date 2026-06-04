import { Worker } from "bullmq";
import { connectDb } from "../config/db.js";
import { connectRedis, redis } from "../config/redis.js";
import { env } from "../config/env.js";
import { Image } from "../models/Image.js";
import { emitImageStatus } from "../services/socket.service.js";
import { processImageGeneration } from "../services/imageGeneration.service.js";

export async function startImageWorker() {
  const connected = await connectRedis();
  if (!connected) {
    console.log("Image worker skipped: Redis is not available");
    return null;
  }

  const worker = new Worker(
    "image-generation",
    async (job) => {
      await processImageGeneration(job.data.imageId);
    },
    { connection: redis, concurrency: env.IMAGE_WORKER_CONCURRENCY }
  );

  worker.on("failed", async (job, error) => {
    const maxAttempts = job?.opts?.attempts || 1;
    if ((job?.attemptsMade || 0) < maxAttempts) return;

    const image = await Image.findById(job?.data?.imageId);
    if (!image) return;

    image.status = "failed";
    image.error = error.message;
    await image.save();
    emitImageStatus(image);
  });

  worker.on("completed", (job) => {
    console.log(`Image job completed: ${job.id}`);
  });

  console.log(`Image worker started with concurrency ${env.IMAGE_WORKER_CONCURRENCY}`);
  return worker;
}

if (process.argv[1]?.endsWith("image.worker.js")) {
  await connectDb();
  await startImageWorker();
}
