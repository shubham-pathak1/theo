import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const baseUrl = "https://generativelanguage.googleapis.com/v1beta";

const modelAliases = {
  "gemini-1.5-flash": "gemini-2.5-flash",
  "gemini-1.5-pro": "gemini-2.5-pro",
  "gemini-2.5-flash-lite-001": "gemini-2.5-flash-lite"
};

const fallbackModels = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.5-flash"];

function normalizeModel(model) {
  return modelAliases[model] || model || env.GEMINI_TEXT_MODEL;
}

export const modelTiers = [
  {
    id: "low",
    label: "Theo Low",
    model: normalizeModel(env.THEO_MODEL_LOW),
    description: "Fast responses for drafts and simple questions."
  },
  {
    id: "medium",
    label: "Theo Medium",
    model: normalizeModel(env.THEO_MODEL_MEDIUM),
    description: "Balanced reasoning for everyday work."
  },
  {
    id: "high",
    label: "Theo High",
    model: normalizeModel(env.THEO_MODEL_HIGH),
    description: "Deeper reasoning for planning and technical tasks."
  },
  {
    id: "xhigh",
    label: "Theo XHigh",
    model: normalizeModel(env.THEO_MODEL_XHIGH),
    description: "Highest quality mode for complex prompts."
  }
];

export function resolveModelTier(tierOrModel = "medium") {
  return modelTiers.find((tier) => tier.id === tierOrModel || tier.model === tierOrModel) || modelTiers[1];
}

function requireGeminiKey() {
  if (!env.GEMINI_API_KEY) {
    if (env.DEMO_MODE || env.NODE_ENV !== "production") {
      return false;
    }
    throw new ApiError(500, "GEMINI_API_KEY is not configured");
  }
  return true;
}

export function toGeminiContents(messages) {
  return messages.map((message) => ({
    role: message.role === "model" ? "model" : "user",
    parts: [{ text: message.content }]
  }));
}

export function demoImageBuffer(prompt, aspectRatio = "1:1", note = "Image generation is running in demo mode") {
  const [width, height] = aspectRatio.split(":").map(Number);
  const svgWidth = width >= height ? 1280 : 960;
  const svgHeight = height > width ? 1280 : width === height ? 1024 : 720;
  const safePrompt = prompt
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .slice(0, 280);
  const safeNote = note
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .slice(0, 180);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#171614"/>
          <stop offset="1" stop-color="#3b342d"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect x="42" y="42" width="${svgWidth - 84}" height="${svgHeight - 84}" rx="32" fill="#f4f1ea"/>
      <text x="82" y="126" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#171614">Theo preview image</text>
      <text x="82" y="178" font-family="Arial, sans-serif" font-size="20" fill="#746b60">${safeNote}</text>
      <foreignObject x="82" y="250" width="${svgWidth - 164}" height="${svgHeight - 330}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:44px;line-height:1.14;font-weight:700;color:#171614;">
          ${safePrompt}
        </div>
      </foreignObject>
    </svg>`;

  return Buffer.from(svg);
}

export async function streamChat({ messages, model, systemInstruction, onToken }) {
  const selectedModel = normalizeModel(model);
  const hasKey = requireGeminiKey();
  if (!hasKey) {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
    const demoText = [
      "I am running in Theo demo mode because no Gemini API key is configured.",
      "",
      `Here is a structured response to your request: ${lastUserMessage}`,
      "",
      "- I would keep the answer concise and action-oriented.",
      "- I would use the conversation summary plus recent turns as context.",
      "- For production, add GEMINI_API_KEY in the server environment."
    ].join("\n");

    for (const token of demoText.match(/.{1,24}(\s|$)/g) || [demoText]) {
      onToken(token);
      await new Promise((resolve) => globalThis.setTimeout(resolve, 18));
    }

    return demoText;
  }

  const modelsToTry = [...new Set([selectedModel, ...fallbackModels])];
  let lastError = "";

  for (const candidateModel of modelsToTry) {
    const response = await fetch(
      `${baseUrl}/models/${candidateModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          system_instruction: systemInstruction
            ? { parts: [{ text: systemInstruction }] }
            : undefined,
          contents: toGeminiContents(messages)
        })
      }
    );

    if (!response.ok) {
      lastError = await response.text();
      if (![429, 500, 503].includes(response.status)) break;
      continue;
    }

    const data = await response.json();
    const fullText = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!fullText) {
      lastError = JSON.stringify(data);
      continue;
    }

    for (const token of fullText.match(/.{1,28}(\s|$)/g) || [fullText]) {
      onToken(token);
      await new Promise((resolve) => globalThis.setTimeout(resolve, 12));
    }

    return fullText;
  }

  throw new ApiError(503, `Gemini request failed: ${lastError || "No usable response from available models"}`);
}

export async function generateImage(prompt, { aspectRatio = "1:1" } = {}) {
  const hasKey = requireGeminiKey();
  if (!hasKey) {
    return demoImageBuffer(prompt, aspectRatio, "Gemini image key not configured");
  }

  const response = await fetch(
    `${baseUrl}/models/${env.GEMINI_IMAGE_MODEL}:predict`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    if (env.NODE_ENV !== "production") {
      return demoImageBuffer(prompt, aspectRatio, "Imagen is paid-only or unavailable for this key");
    }
    throw new ApiError(response.status, `Imagen request failed: ${errorText}`);
  }

  const data = await response.json();
  const image = data.predictions?.[0]?.bytesBase64Encoded;

  if (!image) {
    throw new ApiError(502, "Imagen response did not include an image");
  }

  return Buffer.from(image, "base64");
}
