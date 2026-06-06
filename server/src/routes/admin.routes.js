import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Conversation } from "../models/Conversation.js";
import { Image } from "../models/Image.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { imageQueue } from "../queues/image.queue.js";
import { getUsageForUser } from "../services/usage.service.js";
import { deleteGeneratedImageAsset } from "../services/storage.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

const realSubscriptionQuery = {
  providerSubscriptionId: { $not: /^demo_/ },
  $or: [{ providerOrderId: { $exists: true } }, { providerPaymentId: { $exists: true } }]
};

const userQuerySchema = z.object({
  query: z.object({
    q: z.string().optional().default(""),
    plan: z.enum(["all", "free", "pro", "max"]).optional().default("all"),
    role: z.enum(["all", "user", "admin"]).optional().default("all")
  })
});

const imageQuerySchema = z.object({
  query: z.object({
    status: z.enum(["all", "queued", "processing", "done", "failed", "cancelled"]).optional().default("all")
  })
});

const userParamsSchema = z.object({
  params: z.object({ id: z.string().length(24) })
});

const updateUserSchema = z.object({
  params: z.object({ id: z.string().length(24) }),
  body: z.object({
    plan: z.enum(["free", "pro", "max"]).optional(),
    role: z.enum(["user", "admin"]).optional()
  })
});

const imageParamsSchema = z.object({
  params: z.object({ id: z.string().length(24) })
});

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    plan: user.plan,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function serializeImage(image) {
  return {
    id: image.id,
    prompt: image.prompt,
    status: image.status,
    published: image.published,
    provider: image.provider,
    model: image.model,
    aspectRatio: image.aspectRatio,
    style: image.style,
    url: image.url,
    error: image.error,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
    user: image.user
      ? {
          id: image.user.id,
          displayName: image.user.displayName,
          email: image.user.email
        }
      : null
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function countBy(model, field, match = {}) {
  const rows = await model.aggregate([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } }
  ]);

  return rows.reduce((map, row) => {
    map[row._id || "unknown"] = row.count;
    return map;
  }, {});
}

function lastDays(days = 14) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    return date;
  });
}

async function dailyCounts(model, match = {}, dateField = "createdAt", days = 14) {
  const dates = lastDays(days);
  const since = dates[0];
  const rows = await model.aggregate([
    { $match: { ...match, [dateField]: { $gte: since } } },
    {
      $project: {
        day: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: `$${dateField}`
          }
        }
      }
    },
    { $group: { _id: "$day", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const counts = new Map(rows.map((row) => [row._id, row.count]));
  return dates.map((date) => {
    const day = date.toISOString().slice(0, 10);
    return { day, count: counts.get(day) || 0 };
  });
}

adminRouter.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      totalUsers,
      verifiedUsers,
      totalConversations,
      totalImages,
      publishedImages,
      activeSubscriptions,
      usersByPlan,
      imagesByStatus,
      subscriptionsByStatus,
      newUsers24h,
      images24h,
      failedImages24h,
      userGrowth,
      imageJobs,
      subscriptionGrowth,
      imageFailures
    ] = await Promise.all([
      User.countDocuments({ deletedAt: { $exists: false } }),
      User.countDocuments({ emailVerified: true, deletedAt: { $exists: false } }),
      Conversation.countDocuments({ deletedAt: { $exists: false } }),
      Image.countDocuments(),
      Image.countDocuments({ published: true }),
      Subscription.countDocuments({ ...realSubscriptionQuery, status: { $in: ["created", "authenticated", "active", "activated"] } }),
      countBy(User, "plan", { deletedAt: { $exists: false } }),
      countBy(Image, "status"),
      countBy(Subscription, "status", realSubscriptionQuery),
      User.countDocuments({ createdAt: { $gte: since }, deletedAt: { $exists: false } }),
      Image.countDocuments({ createdAt: { $gte: since } }),
      Image.countDocuments({ status: "failed", updatedAt: { $gte: since } }),
      dailyCounts(User, { deletedAt: { $exists: false } }),
      dailyCounts(Image),
      dailyCounts(Subscription, realSubscriptionQuery),
      dailyCounts(Image, { status: "failed" }, "updatedAt")
    ]);

    res.json({
      totals: {
        users: totalUsers,
        verifiedUsers,
        conversations: totalConversations,
        images: totalImages,
        publishedImages,
        activeSubscriptions
      },
      breakdowns: {
        usersByPlan,
        imagesByStatus,
        subscriptionsByStatus
      },
      activity: {
        newUsers24h,
        images24h,
        failedImages24h
      },
      charts: {
        userGrowth,
        imageJobs,
        subscriptionGrowth,
        imageFailures
      }
    });
  })
);

adminRouter.get(
  "/users",
  validate(userQuerySchema),
  asyncHandler(async (req, res) => {
    const { q, plan, role } = req.validated.query;
    const query = { deletedAt: { $exists: false } };

    if (plan !== "all") query.plan = plan;
    if (role !== "all") query.role = role;
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      query.$or = [
        { email: pattern },
        { displayName: pattern }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 }).limit(80);
    const userIds = users.map((user) => user._id);
    const [imageCounts, conversationCounts] = await Promise.all([
      Image.aggregate([
        { $match: { user: { $in: userIds } } },
        { $group: { _id: "$user", count: { $sum: 1 } } }
      ]),
      Conversation.aggregate([
        { $match: { user: { $in: userIds }, deletedAt: { $exists: false } } },
        { $group: { _id: "$user", count: { $sum: 1 } } }
      ])
    ]);

    const imagesByUser = new Map(imageCounts.map((row) => [String(row._id), row.count]));
    const conversationsByUser = new Map(conversationCounts.map((row) => [String(row._id), row.count]));

    res.json({
      users: users.map((user) => ({
        ...serializeUser(user),
        images: imagesByUser.get(user.id) || 0,
        conversations: conversationsByUser.get(user.id) || 0
      }))
    });
  })
);

adminRouter.patch(
  "/users/:id",
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const patch = {};
    if (req.validated.body.plan) patch.plan = req.validated.body.plan;
    if (req.validated.body.role) patch.role = req.validated.body.role;

    if (!Object.keys(patch).length) {
      throw new ApiError(400, "No user changes provided");
    }

    const user = await User.findByIdAndUpdate(req.validated.params.id, patch, { new: true });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json({ user: serializeUser(user) });
  })
);

adminRouter.get(
  "/users/:id/usage",
  validate(userParamsSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.validated.params.id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json(await getUsageForUser(user));
  })
);

adminRouter.get(
  "/images",
  validate(imageQuerySchema),
  asyncHandler(async (req, res) => {
    const query = {};
    if (req.validated.query.status !== "all") {
      query.status = req.validated.query.status;
    }

    const images = await Image.find(query)
      .populate("user", "displayName email")
      .sort({ createdAt: -1 })
      .limit(80);

    res.json({ images: images.map(serializeImage) });
  })
);

adminRouter.patch(
  "/images/:id/publish",
  validate(imageParamsSchema),
  asyncHandler(async (req, res) => {
    const image = await Image.findById(req.validated.params.id).populate("user", "displayName email");
    if (!image) {
      throw new ApiError(404, "Image not found");
    }

    image.published = !image.published;
    await image.save();

    res.json({ image: serializeImage(image) });
  })
);

adminRouter.delete(
  "/images/:id",
  validate(imageParamsSchema),
  asyncHandler(async (req, res) => {
    const image = await Image.findById(req.validated.params.id);
    if (!image) {
      throw new ApiError(404, "Image not found");
    }

    if (imageQueue && image.jobId && !image.jobId.startsWith("memory_")) {
      const job = await imageQueue.getJob(image.jobId);
      await job?.remove().catch(() => null);
    }

    await deleteGeneratedImageAsset(image);
    await image.deleteOne();

    res.json({ deleted: true, id: image.id });
  })
);

adminRouter.get(
  "/subscriptions",
  asyncHandler(async (_req, res) => {
    const subscriptions = await Subscription.find(realSubscriptionQuery)
      .populate("user", "displayName email plan")
      .sort({ createdAt: -1 })
      .limit(80);

    res.json({
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        plan: subscription.plan,
        provider: subscription.provider,
        providerSubscriptionId: subscription.providerSubscriptionId,
        providerOrderId: subscription.providerOrderId,
        providerPaymentId: subscription.providerPaymentId,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        createdAt: subscription.createdAt,
        user: subscription.user
          ? {
              id: subscription.user.id,
              displayName: subscription.user.displayName,
              email: subscription.user.email,
              plan: subscription.user.plan
            }
          : null
      }))
    });
  })
);
