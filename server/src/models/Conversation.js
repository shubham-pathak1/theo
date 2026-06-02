import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "model"], required: true },
    content: { type: String, required: true, default: "" },
    model: String
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, default: "New chat" },
    messages: [messageSchema],
    contextSummary: { type: String, default: "" },
    compactedUntil: { type: Number, default: 0 },
    pinned: { type: Boolean, default: false },
    deletedAt: Date
  },
  { timestamps: true }
);

export const Conversation = mongoose.model("Conversation", conversationSchema);
