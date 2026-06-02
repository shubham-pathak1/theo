import { Image } from "../models/Image.js";
import { generateImage } from "./gemini.service.js";
import { uploadGeneratedImage } from "./storage.service.js";
import { emitImageStatus } from "./socket.service.js";

export async function processImageGeneration(imageId) {
  const image = await Image.findById(imageId);
  if (!image) return;

  image.status = "processing";
  image.error = "";
  await image.save();
  emitImageStatus(image);

  try {
    const finalPrompt = enhanceImagePrompt(image.prompt, image.style);
    image.enhancedPrompt = finalPrompt;
    await image.save();

    const buffer = await generateImage(finalPrompt, { aspectRatio: image.aspectRatio });
    const uploaded = await uploadGeneratedImage(buffer, {
      userId: image.user.toString(),
      imageId: image.id
    });

    image.status = "done";
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
