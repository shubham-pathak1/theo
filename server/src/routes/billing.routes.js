import Razorpay from "razorpay";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { getUsage } from "../services/usage.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifySignature, verifyWebhookSignature } from "../utils/crypto.js";

export const billingRouter = Router();

const planIds = {
  pro: env.RAZORPAY_PRO_PLAN_ID,
  max: env.RAZORPAY_MAX_PLAN_ID
};

const subscribeSchema = z.object({
  body: z.object({
    plan: z.enum(["pro", "max"])
  })
});

const verifyCheckoutSchema = z.object({
  body: z.object({
    plan: z.enum(["pro", "max"]),
    razorpayPaymentId: z.string().min(1),
    razorpaySubscriptionId: z.string().min(1),
    razorpaySignature: z.string().min(1)
  })
});

function razorpayClient() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET
  });
}

function publicBillingUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    plan: user.plan,
    emailVerified: user.emailVerified,
    customInstructions: user.customInstructions
  };
}

async function activateDemoPlan(userId, plan) {
  const user = await User.findByIdAndUpdate(userId, { plan }, { new: true });
  const subscription = await Subscription.create({
    user: userId,
    plan,
    providerSubscriptionId: `demo_${Date.now()}`,
    status: "activated"
  });

  return { user, subscription };
}

billingRouter.get(
  "/usage",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getUsage(req.user.id, req.user.plan));
  })
);

billingRouter.post(
  "/subscribe",
  requireAuth,
  validate(subscribeSchema),
  asyncHandler(async (req, res) => {
    const { plan } = req.validated.body;
    const razorpay = razorpayClient();
    if (!razorpay || !planIds[plan]) {
      const { user, subscription } = await activateDemoPlan(req.user.id, plan);

      res.status(201).json({
        demo: true,
        subscription,
        user: publicBillingUser(user),
        message: `${plan} plan activated in demo mode`
      });
      return;
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planIds[plan],
      total_count: 12,
      customer_notify: 1,
      notes: {
        userId: req.user.id,
        plan
      }
    });

    await Subscription.create({
      user: req.user.id,
      plan,
      providerSubscriptionId: subscription.id,
      status: subscription.status
    });

    res.status(201).json({
      checkoutRequired: true,
      subscription,
      keyId: env.RAZORPAY_KEY_ID
    });
  })
);

billingRouter.post(
  "/verify",
  requireAuth,
  validate(verifyCheckoutSchema),
  asyncHandler(async (req, res) => {
    if (!env.RAZORPAY_KEY_SECRET) {
      throw new ApiError(500, "Razorpay key secret is not configured");
    }

    const { plan, razorpayPaymentId, razorpaySubscriptionId, razorpaySignature } = req.validated.body;
    const signaturePayload = `${razorpayPaymentId}|${razorpaySubscriptionId}`;
    if (!verifySignature(signaturePayload, razorpaySignature, env.RAZORPAY_KEY_SECRET)) {
      throw new ApiError(400, "Invalid Razorpay checkout signature");
    }

    const subscription = await Subscription.findOneAndUpdate(
      {
        user: req.user.id,
        providerSubscriptionId: razorpaySubscriptionId
      },
      {
        plan,
        status: "activated"
      },
      { new: true }
    );

    if (!subscription) {
      throw new ApiError(404, "Subscription record not found");
    }

    const user = await User.findByIdAndUpdate(req.user.id, { plan }, { new: true });

    res.json({
      user: publicBillingUser(user),
      subscription,
      message: `${plan} plan activated`
    });
  })
);

billingRouter.post(
  "/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const subscription = await Subscription.findOne({
      user: req.user.id,
      status: { $nin: ["cancelled", "completed"] }
    }).sort({ createdAt: -1 });

    if (!subscription) {
      const user = await User.findByIdAndUpdate(req.user.id, { plan: "free" }, { new: true });
      res.json({ user: publicBillingUser(user), message: "Plan moved to free" });
      return;
    }

    const razorpay = razorpayClient();
    if (razorpay && subscription.providerSubscriptionId && !subscription.providerSubscriptionId.startsWith("demo_")) {
      await razorpay.subscriptions.cancel(subscription.providerSubscriptionId, false);
    }

    subscription.status = "cancelled";
    await subscription.save();
    const user = await User.findByIdAndUpdate(req.user.id, { plan: "free" }, { new: true });

    res.json({
      user: publicBillingUser(user),
      subscription,
      message: "Subscription cancelled"
    });
  })
);

billingRouter.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      throw new ApiError(500, "Razorpay webhook secret is not configured");
    }

    const signature = req.headers["x-razorpay-signature"];
    const payload = req.rawBody?.toString() || JSON.stringify(req.body);
    if (!signature || !verifyWebhookSignature(payload, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
      throw new ApiError(400, "Invalid Razorpay signature");
    }

    const event = JSON.parse(payload);
    const entity = event.payload?.subscription?.entity || event.payload?.payment?.entity;
    const userId = entity?.notes?.userId;
    const plan = entity?.notes?.plan;

    if (userId && plan && event.event === "subscription.activated") {
      await Promise.all([
        User.findByIdAndUpdate(userId, { plan }),
        Subscription.findOneAndUpdate(
          { providerSubscriptionId: entity.id },
          { status: entity.status, plan },
          { upsert: true }
        )
      ]);
    }

    if (userId && event.event === "subscription.cancelled") {
      await User.findByIdAndUpdate(userId, { plan: "free" });
      await Subscription.findOneAndUpdate(
        { providerSubscriptionId: entity.id },
        { status: "cancelled" }
      );
    }

    res.json({ received: true });
  })
);
