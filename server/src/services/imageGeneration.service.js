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
    const buffer = await generateImage(image.prompt, { aspectRatio: image.aspectRatio });
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
