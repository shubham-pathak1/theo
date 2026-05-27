import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Conversation } from "../models/Conversation.js";
import { consumeUsage } from "../services/usage.service.js";
import { modelTiers, resolveModelTier, streamChat } from "../services/gemini.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const chatRouter = Router();

const conversationParams = z.object({
  params: z.object({ id: z.string().length(24) })
});

const createConversationSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(120).optional()
  })
});

const renameSchema = z.object({
  params: z.object({ id: z.string().length(24) }),
  body: z.object({
    title: z.string().min(1).max(120)
  })
});

const messageSchema = z.object({
  params: z.object({ id: z.string().length(24) }),
  body: z.object({
    message: z.string().min(1).max(12000),
    model: z.string().min(1).default("medium")
  })
});

chatRouter.use(requireAuth);

function compactMessages(messages) {
  return messages
    .map((message) => `${message.role === "model" ? "Theo" : "User"}: ${message.content}`)
    .join("\n")
    .replace(/\s+/g, " ")
    .slice(0, 2400);
}

async function compactConversationIfNeeded(conversation) {
  const recentCount = env.THEO_CONTEXT_RECENT_MESSAGES;
  const compactAfter = Math.max(env.THEO_COMPACT_AFTER_MESSAGES, recentCount + 2);

  if (conversation.messages.length <= compactAfter) {
    return;
  }

  const compactUntil = Math.max(0, conversation.messages.length - recentCount);
  if (compactUntil <= conversation.compactedUntil) {
    return;
  }

  const oldMessages = conversation.messages.slice(conversation.compactedUntil, compactUntil);
  const newSummary = compactMessages(oldMessages);
  conversation.contextSummary = [conversation.contextSummary, newSummary].filter(Boolean).join("\n").slice(-4000);
  conversation.compactedUntil = compactUntil;
  await conversation.save();
}

function buildSystemInstruction(user, conversation) {
  return [
    user.customInstructions,
    conversation.contextSummary
      ? `Conversation memory summary. Use this as compressed context from earlier turns:\n${conversation.contextSummary}`
      : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

chatRouter.get("/models", (_req, res) => {
  res.json({ models: modelTiers });
});

chatRouter.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({
      user: req.user.id,
      deletedAt: { $exists: false }
    })
      .select("title pinned updatedAt messages")
      .sort({ pinned: -1, updatedAt: -1 });

    res.json({
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        pinned: conversation.pinned,
        updatedAt: conversation.updatedAt,
        preview: conversation.messages.at(-1)?.content || ""
      }))
    });
  })
);

chatRouter.post(
  "/conversations",
  validate(createConversationSchema),
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.create({
      user: req.user.id,
      title: req.validated.body.title || "New chat"
    });

    res.status(201).json({ conversation });
  })
);

chatRouter.get(
  "/conversations/:id",
  validate(conversationParams),
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOne({
      _id: req.validated.params.id,
      user: req.user.id,
      deletedAt: { $exists: false }
    });

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    res.json({ conversation });
  })
);

chatRouter.patch(
  "/conversations/:id",
  validate(renameSchema),
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.validated.params.id, user: req.user.id },
      { title: req.validated.body.title },
      { new: true }
    );

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    res.json({ conversation });
  })
);

chatRouter.delete(
  "/conversations/:id",
  validate(conversationParams),
  asyncHandler(async (req, res) => {
    await Conversation.updateOne(
      { _id: req.validated.params.id, user: req.user.id },
      { deletedAt: new Date() }
    );

    res.json({ message: "Conversation deleted" });
  })
);

chatRouter.post(
  "/conversations/:id/messages",
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const { message, model } = req.validated.body;
    const selectedTier = resolveModelTier(model);
    const conversation = await Conversation.findOne({
      _id: id,
      user: req.user.id,
      deletedAt: { $exists: false }
    });

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    await consumeUsage(req.user, "messages");

    conversation.messages.push({ role: "user", content: message, model: selectedTier.id });
    if (conversation.title === "New chat") {
      conversation.title = message.slice(0, 70);
    }
    await conversation.save();
    await compactConversationIfNeeded(conversation);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });

    const recentMessages = conversation.messages.slice(-env.THEO_CONTEXT_RECENT_MESSAGES).map((entry) => ({
      role: entry.role,
      content: entry.content
    }));

    let assistantText = "";
    try {
      assistantText = await streamChat({
        model: selectedTier.model || env.GEMINI_TEXT_MODEL,
        messages: recentMessages,
        systemInstruction: buildSystemInstruction(req.user, conversation),
        onToken: (token) => {
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      });

      conversation.messages.push({ role: "model", content: assistantText, model: selectedTier.id });
      await conversation.save();
      res.write(`event: done\ndata: ${JSON.stringify({ conversationId: conversation.id })}\n\n`);
      res.end();
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
      res.end();
    }
  })
);
