import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { demoImageBuffer, generateImage as generateGeminiImage } from "./gemini.service.js";

const cloudflareApiBase = "https://api.cloudflare.com/client/v4";

export async function generateImageWithProvider(prompt, { aspectRatio = "1:1", style = "general", negativePrompt = "" } = {}) {
  if (env.IMAGE_PROVIDER === "cloudflare") {
    return generateCloudflareImage(prompt, { aspectRatio, style, negativePrompt });
  }

  if (env.IMAGE_PROVIDER === "gemini") {
    const buffer = await generateGeminiImage(prompt, { aspectRatio });
    return {
      buffer,
      provider: "gemini",
      model: env.GEMINI_IMAGE_MODEL,
      providerJobId: ""
    };
  }

  return {
    buffer: demoImageBuffer(prompt, aspectRatio, "Theo demo image provider"),
    provider: "demo",
    model: "local-svg-preview",
    providerJobId: ""
  };
}

async function generateCloudflareImage(prompt, { aspectRatio, style, negativePrompt }) {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    if (env.NODE_ENV !== "production" || env.DEMO_MODE) {
      return {
        buffer: demoImageBuffer(prompt, aspectRatio, "Cloudflare Workers AI is not configured"),
        provider: "demo",
        model: "cloudflare-missing-credentials",
        providerJobId: ""
      };
    }

    throw new ApiError(500, "Cloudflare Workers AI credentials are not configured");
  }

  const { width, height } = dimensionsForAspectRatio(aspectRatio);
  const response = await fetch(
    `${cloudflareApiBase}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${env.CLOUDFLARE_IMAGE_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: [negativePromptForStyle(style), negativePrompt].filter(Boolean).join(", "),
        width,
        height,
        num_steps: 20,
        guidance: 7.5
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, `Cloudflare image generation failed: ${errorText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    const image = data.result?.image || data.result?.image_b64 || data.image || data.image_b64;
    if (!image) {
      throw new ApiError(502, "Cloudflare response did not include an image");
    }

    return {
      buffer: Buffer.from(image, "base64"),
      provider: "cloudflare",
      model: env.CLOUDFLARE_IMAGE_MODEL,
      providerJobId: data.result?.id || ""
    };
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    provider: "cloudflare",
    model: env.CLOUDFLARE_IMAGE_MODEL,
    providerJobId: ""
  };
}

function dimensionsForAspectRatio(aspectRatio) {
  const ratios = {
    "1:1": { width: 1024, height: 1024 },
    "4:3": { width: 1024, height: 768 },
    "3:4": { width: 768, height: 1024 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 }
  };

  return ratios[aspectRatio] || ratios["1:1"];
}

function negativePromptForStyle(style) {
  const base = "blurry, distorted, malformed, low quality, text artifacts, watermark, extra limbs";
  const stylePrompts = {
    interface: `${base}, unreadable UI text, cluttered controls`,
    editorial: `${base}, messy background, harsh flash`,
    cinematic: `${base}, muddy shadows, overexposed highlights`,
    illustration: `${base}, unfinished sketch, noisy linework`
  };

  return stylePrompts[style] || base;
}
