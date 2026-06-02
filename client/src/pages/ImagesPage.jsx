import { Download, ImagePlus, Sparkles, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api } from "../lib/api.js";

const socket = io("/", { autoConnect: false });

const aspectRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"];

const stylePresets = [
  { id: "editorial", label: "Editorial", hint: "Clean product visuals" },
  { id: "cinematic", label: "Cinematic", hint: "Mood, depth, lighting" },
  { id: "interface", label: "Interface", hint: "App screens and UI" },
  { id: "illustration", label: "Illustration", hint: "Soft drawn detail" }
];

const promptPresets = [
  "A monochrome AI workspace dashboard for founders, polished product screenshot",
  "A premium black and ivory landing page hero for an AI assistant named Theo",
  "A cinematic concept image of an AI model workstation, soft shadows, editorial",
  "A clean app icon for Theo, minimal, black and ivory, subtle spark symbol"
];

export function ImagesPage() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [style, setStyle] = useState("editorial");
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
      const { image } = await api.post("/api/images", { prompt, aspectRatio, style });
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
    <div className="min-h-screen bg-[#1d1c1a] px-4 py-7 pb-24 text-[#f4f1ea] lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Generate with direction.</h1>
            <p className="mt-2 max-w-2xl text-[#aaa49a]">
              Compose prompts, choose a visual treatment, and keep every generation in one reviewable queue.
            </p>
          </div>
          <div className="segmented w-full lg:w-auto">
            {aspectRatios.map((ratio) => (
              <button key={ratio} className={aspectRatio === ratio ? "active" : ""} onClick={() => setAspectRatio(ratio)}>
                {ratio}
              </button>
            ))}
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-[#22211f] p-4 shadow-[0_26px_90px_rgba(0,0,0,0.28)]">
          <div className="grid gap-4 xl:grid-cols-[1fr_270px]">
            <div className="space-y-4">
              <textarea
                className="min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-[#181715] px-5 py-4 text-lg text-[#f4f1ea] outline-none placeholder:text-[#8f887f] focus:border-white/35"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe the image Theo should create..."
              />

              <div className="flex flex-wrap gap-2">
                {promptPresets.map((preset) => (
                  <button
                    key={preset}
                    className="rounded-full border border-white/10 bg-[#2b2a27] px-3 py-2 text-left text-xs text-[#c9c3ba] transition hover:border-white/25 hover:text-[#fffaf0]"
                    onClick={() => setPrompt(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#181715] p-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f887f]">Treatment</p>
                <div className="grid gap-2">
                  {stylePresets.map((preset) => (
                    <button
                      key={preset.id}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        style === preset.id
                          ? "border-[#f4f1ea] bg-[#f4f1ea] text-[#171614]"
                          : "border-white/10 bg-[#24231f] text-[#e8dfd2] hover:border-white/25"
                      }`}
                      onClick={() => setStyle(preset.id)}
                    >
                      <span className="block text-sm font-semibold">{preset.label}</span>
                      <span className={`text-xs ${style === preset.id ? "text-[#5a544c]" : "text-[#8f887f]"}`}>{preset.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button className="primary-btn min-h-14" onClick={generate} disabled={busy || !prompt.trim()}>
                <ImagePlus size={18} />
                {busy ? "Adding to queue" : "Create image"}
              </button>
            </div>
          </div>
        </section>

        {error && <p className="rounded-xl border border-[#d9895f]/30 bg-[#d9895f]/10 px-3 py-2 text-sm text-[#efb18d]">{cleanError(error)}</p>}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Generation history</h2>
              <p className="text-sm text-[#8f887f]">{images.length ? `${images.length} saved request${images.length === 1 ? "" : "s"}` : "No saved requests yet"}</p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#24231f] px-3 py-2 text-xs text-[#aaa49a] sm:flex">
              <Sparkles size={14} />
              <span>Queue updates live</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {images.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-white/15 bg-[#22211f] p-12 text-center">
              <p className="font-serif text-3xl text-[#e8dfd2]">Start with a visual brief.</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#aaa49a]">
                Pick a prompt preset or write your own. Theo will track status, output, and publishing from here.
              </p>
            </div>
          )}

          {images.map((image) => (
            <article key={image._id} className="overflow-hidden rounded-3xl border border-white/10 bg-[#22211f]">
              <ImagePreview image={image} />
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <StatusPill status={image.status} />
                  <span className="text-xs text-[#8f887f]">{formatDate(image.createdAt)}</span>
                </div>
                <p className="min-h-12 text-sm leading-6 text-[#f4f1ea]">{image.prompt}</p>
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-xs uppercase tracking-[0.16em] text-[#8f887f]">
                    {image.style || "general"} / {image.aspectRatio}
                  </span>
                  <div className="flex gap-2">
                    {image.url ? (
                      <a className="icon-btn" href={image.url} download title="Download">
                        <Download size={17} />
                      </a>
                    ) : (
                      <button className="icon-btn" disabled title="Download">
                        <Download size={17} />
                      </button>
                    )}
                    <button className="icon-btn" onClick={() => publish(image._id)} disabled={image.status !== "done"} title="Publish">
                      <Upload size={17} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ImagePreview({ image }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (image.url && !imageFailed) {
    return (
      <div className="aspect-square bg-[#11110f]">
        <img
          src={image.thumbnailUrl || image.url}
          alt={image.prompt}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  const failed = image.status === "failed" || imageFailed;

  return (
    <div className="grid aspect-square place-items-center bg-[#171614] p-6">
      <div className="max-w-xs text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-[#24231f] text-[#f4f1ea]">
          <Sparkles size={20} />
        </div>
        <p className="font-serif text-2xl text-[#e8dfd2]">{imageFailed ? "Preview unavailable" : failed ? "Provider limit" : titleCase(image.status)}</p>
        <p className="mt-2 text-sm leading-6 text-[#8f887f]">
          {imageFailed
            ? "The image was generated, but the stored preview URL could not be loaded."
            : failed
              ? cleanError(image.error)
              : "Theo is preparing this request. The preview will update when the job finishes."}
        </p>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const label = status === "done" ? "Ready" : status === "failed" ? "Paused" : titleCase(status);
  const tone = status === "done" ? "text-emerald-200" : status === "failed" ? "text-[#efb18d]" : "text-[#d8d1c7]";

  return (
    <span className={`rounded-full border border-white/10 bg-[#181715] px-3 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function cleanError(value = "") {
  const text = String(value);
  const jsonStart = text.indexOf("{");

  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(text.slice(jsonStart));
      const message = parsed?.error?.message || parsed?.message;
      if (message) return cleanError(message);
    } catch {
      // Fall through to text cleanup.
    }
  }

  if (text.toLowerCase().includes("only available on paid plans")) {
    return "Image generation is paused by the provider plan limit. The request is saved in history.";
  }

  if (text.toLowerCase().includes("request failed")) {
    return "Image generation could not be completed right now. The request is saved in history.";
  }

  return text || "Image generation could not be completed right now.";
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function titleCase(value = "") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
