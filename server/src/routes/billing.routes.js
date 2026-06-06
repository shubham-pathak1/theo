import Razorpay from "razorpay";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { getUsageForUser } from "../services/usage.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifySignature, verifyWebhookSignature } from "../utils/crypto.js";

export const billingRouter = Router();

const planAmounts = {
  pro: 19900,
  max: 49900
};

const realPaymentRecordQuery = {
  providerSubscriptionId: { $not: /^demo_/ },
  $or: [{ providerOrderId: { $exists: true } }, { providerPaymentId: { $exists: true } }]
};

const subscribeSchema = z.object({
  body: z.object({
    plan: z.enum(["pro", "max"])
  })
});

const verifyCheckoutSchema = z.object({
  body: z.object({
    plan: z.enum(["pro", "max"]),
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
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

function planPeriodEnd(entity) {
  const timestamp = entity?.current_end || entity?.charge_at || entity?.end_at;
  return timestamp ? new Date(timestamp * 1000) : undefined;
}

function nextPlanPeriodEnd() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

function billingConfigError(plan) {
  if (!env.RAZORPAY_KEY_ID) {
    return new ApiError(500, "Razorpay key ID is not configured", { code: "RAZORPAY_KEY_ID_MISSING" });
  }
  if (!env.RAZORPAY_KEY_SECRET) {
    return new ApiError(500, "Razorpay key secret is not configured", { code: "RAZORPAY_KEY_SECRET_MISSING" });
  }
  return null;
}

function razorpayError(error) {
  const statusCode = error?.statusCode || error?.error?.code || 502;
  const description = error?.error?.description || error?.message || "Razorpay request failed";
  const code = error?.error?.reason || error?.error?.code || "RAZORPAY_REQUEST_FAILED";
  if (statusCode === 401 || description.toLowerCase().includes("authentication")) {
    return new ApiError(
      502,
      "Razorpay rejected the configured test key or secret. Use the Key ID and Secret from the same Razorpay test key pair, then restart the backend.",
      { code, providerMessage: description }
    );
  }
  return new ApiError(502, `Razorpay payment failed: ${description}`, { code, providerMessage: description });
}

billingRouter.get(
  "/usage",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getUsageForUser(req.user));
  })
);

billingRouter.get(
  "/subscriptions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const subscriptions = await Subscription.find({
      user: req.user.id,
      ...realPaymentRecordQuery
    })
      .sort({ createdAt: -1 })
      .limit(12);
    res.json({ subscriptions });
  })
);

billingRouter.post(
  "/subscribe",
  requireAuth,
  validate(subscribeSchema),
  asyncHandler(async (req, res) => {
    const { plan } = req.validated.body;
    const razorpay = razorpayClient();
    const configError = billingConfigError(plan);
    if (!razorpay || configError) throw configError;

    let order;
    try {
      order = await razorpay.orders.create({
        amount: planAmounts[plan],
        currency: "INR",
        receipt: `theo_${plan}_${Date.now()}`,
        notes: {
          userId: req.user.id,
          plan
        }
      });
    } catch (error) {
      throw razorpayError(error);
    }

    await Subscription.create({
      user: req.user.id,
      plan,
      providerOrderId: order.id,
      status: "created"
    });
    console.info("Razorpay order created", { userId: req.user.id, plan, orderId: order.id });

    res.status(201).json({
      checkoutRequired: true,
      order,
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

    const { plan, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.validated.body;
    const signaturePayload = `${razorpayOrderId}|${razorpayPaymentId}`;
    if (!verifySignature(signaturePayload, razorpaySignature, env.RAZORPAY_KEY_SECRET)) {
      throw new ApiError(400, "Invalid Razorpay checkout signature");
    }

    const subscription = await Subscription.findOneAndUpdate(
      {
        user: req.user.id,
        providerOrderId: razorpayOrderId
      },
      {
        plan,
        status: "activated",
        providerPaymentId: razorpayPaymentId,
        currentPeriodEnd: nextPlanPeriodEnd()
      },
      { new: true }
    );

    if (!subscription) {
      throw new ApiError(404, "Billing record not found");
    }

    const user = await User.findByIdAndUpdate(req.user.id, { plan }, { new: true });
    console.info("Razorpay checkout verified", { userId: req.user.id, plan, orderId: razorpayOrderId, paymentId: razorpayPaymentId });

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
      status: { $nin: ["cancelled", "completed"] },
      ...realPaymentRecordQuery
    }).sort({ createdAt: -1 });

    if (!subscription) {
      const user = await User.findByIdAndUpdate(req.user.id, { plan: "free" }, { new: true });
      res.json({ user: publicBillingUser(user), message: "Plan moved to free" });
      return;
    }

    subscription.status = "cancelled";
    await subscription.save();
    const user = await User.findByIdAndUpdate(req.user.id, { plan: "free" }, { new: true });
    console.info("Plan cancelled", {
      userId: req.user.id,
      orderId: subscription.providerOrderId,
      paymentId: subscription.providerPaymentId
    });

    res.json({
      user: publicBillingUser(user),
      subscription,
      message: "Plan cancelled"
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
    console.info("Razorpay webhook received", { event: event.event });
    const entity = event.payload?.payment?.entity || event.payload?.order?.entity || event.payload?.subscription?.entity;
    const orderId = entity?.order_id || event.payload?.order?.entity?.id;
    const paymentId = event.payload?.payment?.entity?.id;
    const existing = orderId
      ? await Subscription.findOne({ providerOrderId: orderId })
      : paymentId
        ? await Subscription.findOne({ providerPaymentId: paymentId })
        : null;
    const userId = entity?.notes?.userId || existing?.user;
    const plan = entity?.notes?.plan || existing?.plan;
    const inactiveEvents = new Set(["payment.failed"]);
    const status = event.event === "payment.failed" ? "past_due" : entity?.status || existing?.status;
    const shouldActivate = userId && plan && ["payment.captured", "payment.authorized"].includes(event.event);
    const shouldDeactivate = userId && inactiveEvents.has(event.event);

    if ((orderId || paymentId) && userId && plan) {
      await Subscription.findOneAndUpdate(
        orderId ? { providerOrderId: orderId } : { providerPaymentId: paymentId },
        {
          user: userId,
          plan,
          provider: "razorpay",
          providerOrderId: orderId,
          providerPaymentId: paymentId,
          status: shouldActivate ? "activated" : status,
          currentPeriodEnd: shouldActivate ? nextPlanPeriodEnd() : planPeriodEnd(entity)
        },
        { upsert: true }
      );
    }

    if (shouldActivate) {
      await User.findByIdAndUpdate(userId, { plan });
    }

    if (shouldDeactivate) {
      await User.findByIdAndUpdate(userId, { plan: "free" });
    }

    res.json({ received: true });
  })
);
