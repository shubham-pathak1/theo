import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const baseUrl = "https://generativelanguage.googleapis.com/v1beta";

export const modelTiers = [
  {
    id: "low",
    label: "Theo Low",
    model: env.THEO_MODEL_LOW,
    description: "Fast responses for drafts and simple questions."
  },
  {
    id: "medium",
    label: "Theo Medium",
    model: env.THEO_MODEL_MEDIUM,
    description: "Balanced reasoning for everyday work."
  },
  {
    id: "high",
    label: "Theo High",
    model: env.THEO_MODEL_HIGH,
    description: "Deeper reasoning for planning and technical tasks."
  },
  {
    id: "xhigh",
    label: "Theo XHigh",
    model: env.THEO_MODEL_XHIGH,
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

export async function streamChat({ messages, model, systemInstruction, onToken }) {
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

  const response = await fetch(
    `${baseUrl}/models/${model}:streamGenerateContent?alt=sse`,
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

  if (!response.ok || !response.body) {
    throw new ApiError(response.status, `Gemini stream failed: ${await response.text()}`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";

    for (const frame of frames) {
      const line = frame.split("\n").find((entry) => entry.startsWith("data: "));
      if (!line) continue;

      const payload = JSON.parse(line.slice(6));
      const token = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("");

      if (token) {
        fullText += token;
        onToken(token);
      }
    }
  }

  return fullText;
}

export async function generateImage(prompt, { aspectRatio = "1:1" } = {}) {
  const hasKey = requireGeminiKey();
  if (!hasKey) {
    const [width, height] = aspectRatio.split(":").map(Number);
    const svgWidth = width >= height ? 1280 : 960;
    const svgHeight = height > width ? 1280 : width === height ? 1024 : 720;
    const safePrompt = prompt
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .slice(0, 240);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
        <rect width="100%" height="100%" fill="#111111"/>
        <rect x="32" y="32" width="${svgWidth - 64}" height="${svgHeight - 64}" rx="28" fill="#f6f2ea"/>
        <text x="72" y="110" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#111111">Theo demo image</text>
        <text x="72" y="166" font-family="Arial, sans-serif" font-size="20" fill="#555555">Gemini image key not configured</text>
        <foreignObject x="72" y="230" width="${svgWidth - 144}" height="${svgHeight - 300}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:42px;line-height:1.16;font-weight:700;color:#111;">
            ${safePrompt}
          </div>
        </foreignObject>
      </svg>`;

    return Buffer.from(svg);
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
    throw new ApiError(response.status, `Imagen request failed: ${await response.text()}`);
  }

  const data = await response.json();
  const image = data.predictions?.[0]?.bytesBase64Encoded;

  if (!image) {
    throw new ApiError(502, "Imagen response did not include an image");
  }

  return Buffer.from(image, "base64");
}
