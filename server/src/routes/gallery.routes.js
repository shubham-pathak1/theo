import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Image } from "../models/Image.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const galleryRouter = Router();

const feedSchema = z.object({
  query: z.object({
    style: z.string().optional(),
    sort: z.enum(["new", "liked"]).optional().default("new")
  })
});

const imageParams = z.object({
  params: z.object({ id: z.string().length(24) })
});

galleryRouter.get(
  "/",
  validate(feedSchema),
  asyncHandler(async (req, res) => {
    const query = { published: true, status: "done" };
    if (req.validated.query.style) {
      query.style = req.validated.query.style;
    }

    const images = await Image.find(query)
      .populate("user", "displayName avatarUrl")
      .sort(req.validated.query.sort === "liked" ? { likes: -1 } : { createdAt: -1 })
      .limit(60);

    res.json({ images });
  })
);

galleryRouter.post(
  "/:id/like",
  requireAuth,
  validate(imageParams),
  asyncHandler(async (req, res) => {
    const image = await Image.findOne({ _id: req.validated.params.id, published: true });
    if (!image) {
      throw new ApiError(404, "Image not found");
    }

    const alreadyLiked = image.likes.some((id) => id.equals(req.user.id));
    image.likes = alreadyLiked
      ? image.likes.filter((id) => !id.equals(req.user.id))
      : [...image.likes, req.user._id];
    await image.save();

    res.json({ image });
  })
);

galleryRouter.post(
  "/:id/save",
  requireAuth,
  validate(imageParams),
  asyncHandler(async (req, res) => {
    const image = await Image.findOne({ _id: req.validated.params.id, published: true });
    if (!image) {
      throw new ApiError(404, "Image not found");
    }

    const alreadySaved = image.saves.some((id) => id.equals(req.user.id));
    image.saves = alreadySaved
      ? image.saves.filter((id) => !id.equals(req.user.id))
      : [...image.saves, req.user._id];
    await image.save();

    res.json({ image });
  })
);
