import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    prompt: { type: String, required: true },
    enhancedPrompt: String,
    aspectRatio: { type: String, default: "1:1" },
    status: {
      type: String,
      enum: ["queued", "processing", "done", "failed"],
      default: "queued",
      index: true
    },
    jobId: String,
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
