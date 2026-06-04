import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

function hasCloudinary() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function detectMime(buffer) {
  const text = buffer.subarray(0, 128).toString("utf8").trimStart();
  return text.startsWith("<svg") ? "image/svg+xml" : "image/png";
}

export async function uploadGeneratedImage(buffer, { userId, imageId }) {
  const mimeType = detectMime(buffer);

  if (!hasCloudinary()) {
    const outputDir = path.resolve(process.cwd(), "uploads", "generated", userId);
    await fs.mkdir(outputDir, { recursive: true });
    const extension = mimeType === "image/svg+xml" ? "svg" : "png";
    const filename = `${imageId}.${extension}`;
    const filePath = path.join(outputDir, filename);
    await fs.writeFile(filePath, buffer);
    const publicPath = `/uploads/generated/${userId}/${filename}`;

    return {
      publicId: `local/${userId}/${imageId}`,
      url: `${env.SERVER_URL}${publicPath}`,
      thumbnailUrl: `${env.SERVER_URL}${publicPath}`
    };
  }

  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `theo/generated/${userId}`,
    public_id: imageId,
    overwrite: true,
    resource_type: "image"
  });

  return {
    publicId: result.public_id,
    url: result.secure_url,
    thumbnailUrl: cloudinary.url(result.public_id, {
      secure: true,
      width: 480,
      height: 480,
      crop: "fill",
      quality: "auto",
      fetch_format: "auto"
    })
  };
}

export async function deleteGeneratedImageAsset(image) {
  if (!image?.cloudinaryPublicId) return;

  if (image.cloudinaryPublicId.startsWith("local/")) {
    await deleteLocalGeneratedFiles(image.cloudinaryPublicId);
    return;
  }

  if (!hasCloudinary()) return;
  await cloudinary.uploader.destroy(image.cloudinaryPublicId, { resource_type: "image" });
}

export async function cleanupOldLocalGeneratedFiles() {
  if (hasCloudinary()) return { deleted: 0 };

  const rootDir = path.resolve(process.cwd(), "uploads", "generated");
  const cutoff = Date.now() - env.LOCAL_UPLOAD_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;

  try {
    await fs.access(rootDir);
  } catch {
    return { deleted };
  }

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        await removeEmptyDirectory(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const stats = await fs.stat(fullPath);
      if (stats.mtimeMs >= cutoff) continue;

      await fs.rm(fullPath, { force: true });
      deleted += 1;
    }
  }

  await walk(rootDir);
  return { deleted };
}

async function deleteLocalGeneratedFiles(publicId) {
  const [, userId, imageId] = publicId.split("/");
  if (!userId || !imageId) return;

  const directory = path.resolve(process.cwd(), "uploads", "generated", userId);
  const extensions = ["png", "svg", "jpg", "jpeg", "webp"];

  await Promise.all(
    extensions.map((extension) => fs.rm(path.join(directory, `${imageId}.${extension}`), { force: true }))
  );
  await removeEmptyDirectory(directory).catch(() => null);
}

async function removeEmptyDirectory(directory) {
  const entries = await fs.readdir(directory);
  if (entries.length === 0) {
    await fs.rmdir(directory);
  }
}
