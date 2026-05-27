import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true, _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: String,
    googleId: String,
    displayName: { type: String, required: true },
    avatarUrl: String,
    bio: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    plan: { type: String, enum: ["free", "pro", "max"], default: "free" },
    emailVerified: { type: Boolean, default: false },
    verificationTokenHash: String,
    passwordResetTokenHash: String,
    passwordResetExpiresAt: Date,
    customInstructions: { type: String, default: "" },
    refreshTokens: [refreshTokenSchema],
    deletedAt: Date
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
