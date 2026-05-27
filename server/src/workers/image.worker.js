import { Worker } from "bullmq";
import { connectDb } from "../config/db.js";
import { redis } from "../config/redis.js";
import { Image } from "../models/Image.js";
import { emitImageStatus } from "../services/socket.service.js";
import { processImageGeneration } from "../services/imageGeneration.service.js";

export async function startImageWorker() {
  const worker = new Worker(
    "image-generation",
    async (job) => {
      await processImageGeneration(job.data.imageId);
    },
    { connection: redis, concurrency: 2 }
  );

  worker.on("failed", async (job, error) => {
    const image = await Image.findById(job?.data?.imageId);
    if (!image) return;

    image.status = "failed";
    image.error = error.message;
    await image.save();
    emitImageStatus(image);
  });

  console.log("Image worker started");
  return worker;
}

if (process.argv[1]?.endsWith("image.worker.js")) {
  await connectDb();
  await startImageWorker();
}
