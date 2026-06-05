import { Image, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { imageStatuses } from "../adminConstants.js";
import { AdminPageFrame, Panel } from "../components/AdminPageFrame.jsx";
import { FilterSelect, StatusPill, formatDate } from "../components/AdminTable.jsx";

export function AdminImagesPage() {
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState("all");
  const [notice, setNotice] = useState("");

  async function loadImages() {
    try {
      const data = await api.get(`/api/admin/images?status=${status}`);
      setImages(data.images || []);
    } catch (error) {
      setNotice(error.message);
    }
  }

  useEffect(() => {
    loadImages();
  }, [status]);

  async function togglePublish(imageId) {
    try {
      const data = await api.patch(`/api/admin/images/${imageId}/publish`, {});
      setImages((current) => current.map((image) => (image.id === imageId ? data.image : image)));
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function deleteImage(imageId) {
    try {
      await api.delete(`/api/admin/images/${imageId}`);
      setImages((current) => current.filter((image) => image.id !== imageId));
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <AdminPageFrame eyebrow="Image jobs" title="Generation operations" subtitle="Track job status, failures, and gallery publishing." notice={notice}>
      <Panel title="Jobs" action={<FilterSelect value={status} options={imageStatuses} onChange={setStatus} />}>
        <div className="divide-y divide-white/10">
          {images.map((image) => (
            <article key={image.id} className="grid gap-4 py-4 lg:grid-cols-[88px_1fr_auto]">
              <div className="aspect-square overflow-hidden border border-white/10 bg-[#151412]">
                {image.url ? (
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-[#6f6960]">
                    <Image size={22} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill value={image.status} />
                  {image.published && <StatusPill value="published" />}
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-[#e8dfd2]">{image.prompt}</p>
                <p className="mt-2 text-xs text-[#8f887f]">
                  {image.user?.displayName || "Unknown"} / {image.provider || "local"} / {formatDate(image.createdAt)}
                </p>
                {image.error && <p className="mt-2 text-xs text-[#d9895f]">{image.error}</p>}
              </div>
              <div className="flex items-center gap-2 lg:justify-end">
                <button className="icon-btn" onClick={() => togglePublish(image.id)}>{image.published ? "Unpublish" : "Publish"}</button>
                <button className="icon-btn" onClick={() => deleteImage(image.id)} title="Delete image"><Trash2 size={17} /></button>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </AdminPageFrame>
  );
}
