import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: ["free", "pro", "max"], required: true },
    provider: { type: String, enum: ["razorpay"], default: "razorpay" },
    providerSubscriptionId: String,
    status: { type: String, default: "created" },
    currentPeriodEnd: Date
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
