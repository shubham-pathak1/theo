import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Image } from "../models/Image.js";
import { redis } from "../config/redis.js";
import { imageQueue } from "../queues/image.queue.js";
import { consumeUsage } from "../services/usage.service.js";
import { processImageGeneration } from "../services/imageGeneration.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const imageRouter = Router();

const createImageSchema = z.object({
  body: z.object({
    prompt: z.string().min(3).max(2000),
    aspectRatio: z.enum(["1:1", "3:4", "4:3", "9:16", "16:9"]).default("1:1"),
    style: z.string().max(80).optional().default("general")
  })
});

const imageParams = z.object({
  params: z.object({ id: z.string().length(24) })
});

imageRouter.use(requireAuth);

imageRouter.post(
  "/",
  validate(createImageSchema),
  asyncHandler(async (req, res) => {
    await consumeUsage(req.user, "images");

    const image = await Image.create({
      user: req.user.id,
      prompt: req.validated.body.prompt,
      aspectRatio: req.validated.body.aspectRatio,
      style: req.validated.body.style
    });

    try {
      if (!imageQueue || redis?.status !== "ready") {
        throw new Error("Redis not ready");
      }
      const job = await imageQueue.add("generate", { imageId: image.id }, { attempts: 2 });
      image.jobId = job.id;
    } catch {
      image.jobId = `memory_${image.id}`;
      globalThis.setTimeout(() => {
        processImageGeneration(image.id).catch(() => null);
      }, 0);
    }
    await image.save();

    res.status(202).json({ image });
  })
);

imageRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const images = await Image.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(60);
    res.json({ images });
  })
);

imageRouter.get(
  "/:id",
  validate(imageParams),
  asyncHandler(async (req, res) => {
    const image = await Image.findOne({ _id: req.validated.params.id, user: req.user.id });
    if (!image) {
      throw new ApiError(404, "Image not found");
    }

    res.json({ image });
  })
);

imageRouter.post(
  "/:id/publish",
  validate(imageParams),
  asyncHandler(async (req, res) => {
    const image = await Image.findOne({ _id: req.validated.params.id, user: req.user.id });

    if (!image) {
      throw new ApiError(404, "Image not found");
    }

    if (image.status !== "done") {
      throw new ApiError(400, "Only completed images can be published");
    }

    image.published = true;
    await image.save();

    res.json({ image });
  })
);
