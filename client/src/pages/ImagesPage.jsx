import { Download, ImagePlus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api } from "../lib/api.js";

const socket = io("/", { autoConnect: false });

export function ImagesPage() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadImages();
    socket.connect();

    socket.on("image:status", (update) => {
      setImages((items) => items.map((image) => (image._id === update.id ? { ...image, ...update } : image)));
    });

    return () => {
      socket.off("image:status");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    images.forEach((image) => {
      if (image.status === "queued" || image.status === "processing") {
        socket.emit("image:watch", image._id);
      }
    });
  }, [images]);

  async function loadImages() {
    const data = await api.get("/api/images");
    setImages(data.images);
  }

  async function generate() {
    if (!prompt.trim()) return;
    setError("");
    setBusy(true);

    try {
      const { image } = await api.post("/api/images", { prompt, aspectRatio });
      setImages((items) => [image, ...items]);
      setPrompt("");
      socket.emit("image:watch", image._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function publish(id) {
    const { image } = await api.post(`/api/images/${id}/publish`, {});
    setImages((items) => items.map((item) => (item._id === id ? image : item)));
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] px-4 py-6 pb-24 text-[#181817] dark:bg-[#111111] dark:text-[#f4f1ea] lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Image Studio</h1>
            <p className="mt-2 text-black/60 dark:text-white/55">Generate images, keep history, publish your best work.</p>
          </div>
          <div className="segmented w-full lg:w-auto">
            {["1:1", "4:3", "3:4", "16:9", "9:16"].map((ratio) => (
              <button key={ratio} className={aspectRatio === ratio ? "active" : ""} onClick={() => setAspectRatio(ratio)}>
                {ratio}
              </button>
            ))}
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <textarea
            className="min-h-28 rounded-md border border-black/10 bg-white px-4 py-3 outline-none focus:border-black/40 dark:border-white/10 dark:bg-white/5 dark:focus:border-white/40"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the image"
          />
          <button className="primary-btn min-w-40" onClick={generate} disabled={busy}>
            <ImagePlus size={18} />
            {busy ? "Queueing" : "Generate"}
          </button>
        </section>

        {error && <p className="mt-4 rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {images.length === 0 && (
            <div className="col-span-full rounded-md border border-black/10 bg-white p-10 text-center text-sm text-black/55 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
              No generations yet. Write a prompt to create your first Theo image.
            </div>
          )}

          {images.map((image) => (
            <article key={image._id} className="overflow-hidden rounded-md border border-line bg-white dark:border-white/10 dark:bg-white/5">
              <div className="aspect-square bg-line/40 dark:bg-white/10">
                {image.url ? (
                  <img src={image.thumbnailUrl || image.url} alt={image.prompt} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-sm uppercase tracking-[0.16em] text-ink/45 dark:text-paper/45">
                    {image.status === "failed" ? image.error || "failed" : image.status}
                  </div>
                )}
              </div>
              <div className="space-y-3 p-3">
                <p className="line-clamp-3 text-sm">{image.prompt}</p>
                <div className="flex gap-2">
                  <a className="icon-btn flex-1" href={image.url} download title="Download">
                    <Download size={17} />
                  </a>
                  <button className="icon-btn flex-1" onClick={() => publish(image._id)} disabled={image.status !== "done"} title="Publish">
                    <Upload size={17} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
