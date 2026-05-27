import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Conversation } from "../models/Conversation.js";
import { Image } from "../models/Image.js";
import { User } from "../models/User.js";
import { publicUser } from "./auth.routes.js";

export const userRouter = Router();

const profileSchema = z.object({
  body: z.object({
    displayName: z.string().min(2).max(80),
    bio: z.string().max(240).optional().default(""),
    avatarUrl: z.string().url().optional().or(z.literal(""))
  })
});

const settingsSchema = z.object({
  body: z.object({
    customInstructions: z.string().max(2000).optional().default("")
  })
});

userRouter.use(requireAuth);

userRouter.patch("/profile", validate(profileSchema), async (req, res, next) => {
  try {
    Object.assign(req.user, req.validated.body);
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  } catch (error) {
    next(error);
  }
});

userRouter.patch("/settings", validate(settingsSchema), async (req, res, next) => {
  try {
    req.user.customInstructions = req.validated.body.customInstructions;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  } catch (error) {
    next(error);
  }
});

userRouter.delete("/account", async (req, res, next) => {
  try {
    await Promise.all([
      Conversation.deleteMany({ user: req.user.id }),
      Image.deleteMany({ user: req.user.id }),
      User.findByIdAndUpdate(req.user.id, {
        deletedAt: new Date(),
        email: `deleted-${req.user.id}@theo.local`,
        passwordHash: undefined,
        refreshTokens: []
      })
    ]);

    res.json({ message: "Account deleted" });
  } catch (error) {
    next(error);
  }
});
