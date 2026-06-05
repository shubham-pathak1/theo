import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    prompt: { type: String, required: true },
    negativePrompt: { type: String, default: "" },
    enhancedPrompt: String,
    aspectRatio: { type: String, default: "1:1" },
    status: {
      type: String,
      enum: ["queued", "processing", "done", "failed", "cancelled"],
      default: "queued",
      index: true
    },
    jobId: String,
    provider: String,
    model: String,
    providerJobId: String,
    cloudinaryPublicId: String,
    url: String,
    thumbnailUrl: String,
    error: String,
    published: { type: Boolean, default: false, index: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    saves: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    style: { type: String, default: "general" }
  },
  { timestamps: true }
);

export const Image = mongoose.model("Image", imageSchema);
