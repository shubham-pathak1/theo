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
import { verifyWebhookSignature } from "../utils/crypto.js";

export const billingRouter = Router();

const planIds = {
  pro: "plan_replace_with_razorpay_pro_id",
  max: "plan_replace_with_razorpay_max_id"
};

const subscribeSchema = z.object({
  body: z.object({
    plan: z.enum(["pro", "max"])
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
    if (!razorpay || planIds[plan].startsWith("plan_replace")) {
      await User.findByIdAndUpdate(req.user.id, { plan });
      const subscription = await Subscription.create({
        user: req.user.id,
        plan,
        providerSubscriptionId: `demo_${Date.now()}`,
        status: "activated"
      });

      res.status(201).json({
        demo: true,
        subscription,
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
      subscription,
      keyId: env.RAZORPAY_KEY_ID
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
