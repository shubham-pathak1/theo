import { Image } from "../models/Image.js";
import { generateImageWithProvider } from "./imageProvider.service.js";
import { uploadGeneratedImage } from "./storage.service.js";
import { emitImageStatus } from "./socket.service.js";

export async function processImageGeneration(imageId) {
  const image = await Image.findById(imageId);
  if (!image) return;
  if (image.status === "cancelled" || image.status === "done") return;

  image.status = "processing";
  image.error = "";
  await image.save();
  emitImageStatus(image);

  try {
    const finalPrompt = enhanceImagePrompt(image.prompt, image.style);
    image.enhancedPrompt = finalPrompt;
    await image.save();

    if (await isCancelled(imageId)) return;

    const generated = await generateImageWithProvider(finalPrompt, {
      aspectRatio: image.aspectRatio,
      style: image.style
    });

    if (await isCancelled(imageId)) return;

    const uploaded = await uploadGeneratedImage(generated.buffer, {
      userId: image.user.toString(),
      imageId: image.id
    });

    if (await isCancelled(imageId)) return;

    image.status = "done";
    image.provider = generated.provider;
    image.model = generated.model;
    image.providerJobId = generated.providerJobId;
    image.cloudinaryPublicId = uploaded.publicId;
    image.url = uploaded.url;
    image.thumbnailUrl = uploaded.thumbnailUrl;
    await image.save();
    emitImageStatus(image);
  } catch (error) {
    image.status = "failed";
    image.error = error.message;
    await image.save();
    emitImageStatus(image);
    throw error;
  }
}

async function isCancelled(imageId) {
  const latest = await Image.findById(imageId).select("status");
  return !latest || latest.status === "cancelled";
}

function enhanceImagePrompt(prompt, style = "general") {
  const treatments = {
    editorial: "clean editorial product photography, premium black and ivory palette, refined lighting, crisp composition",
    cinematic: "cinematic lighting, realistic depth, soft contrast, atmospheric but clear subject framing",
    interface: "polished app interface screenshot, clean layout, premium SaaS product design, readable details",
    illustration: "high quality editorial illustration, soft hand-finished detail, balanced composition"
  };

  const treatment = treatments[style] || treatments.editorial;
  return `${prompt}. Visual treatment: ${treatment}. Avoid clutter, keep the main subject clear.`;
}
