import { Copy, Download, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

const demoImageUrls = [
  new URL("../../gallery_demo_img/img10.jpeg", import.meta.url).href,
  new URL("../../gallery_demo_img/img9.jpeg", import.meta.url).href,
  new URL("../../gallery_demo_img/img8.jpeg", import.meta.url).href,
  new URL("../../gallery_demo_img/img7.jpeg", import.meta.url).href,
  new URL("../../gallery_demo_img/img6.jpeg", import.meta.url).href,
  new URL("../../gallery_demo_img/img5.jpeg", import.meta.url).href,
  new URL("../../gallery_demo_img/img4.jpeg", import.meta.url).href,
  new URL("../../gallery_demo_img/img3.jpeg", import.meta.url).href,
  new URL("../../gallery_demo_img/img2.jpeg", import.meta.url).href,
  new URL("../../gallery_demo_img/img1.jpeg", import.meta.url).href
];

const showcasePrompts = [
  "A transparent red cassette tape on warm sunlight, close-up macro photography, rich analog texture",
  "Two blurred figures walking through a blue misty landscape, cinematic grain, soft focus, dreamlike depth",
  "A clear cassette tape with wired earphones on a sunlit desk, golden hour lighting, nostalgic product photo",
  "A cat silhouette against a glowing window at sunset, warm rim light, quiet cinematic composition",
  "Large orange clouds drifting across a dark sky, dramatic contrast, painterly film grain, atmospheric scale",
  "Two people sitting in a field under a violet storm cloud, surreal sunset colors, reflective mood",
  "A blurred city window at dusk with a passing figure, retro color cast, soft motion, quiet street scene",
  "A person standing on a wooden bridge with wing-like shadows, mountain forest background, cinematic framing",
  "A lone figure in a glowing fog field, peach and blue light beams, dreamy editorial atmosphere",
  "A person cycling through a garden beside a blue glass building, floating papers, magical realism"
];

const showcaseImages = demoImageUrls.map((url, index) => ({
  _id: `demo-${index + 1}`,
  prompt: showcasePrompts[index],
  url,
  thumbnailUrl: url,
  published: true,
  demo: true
}));

export function GalleryPage() {
  const [publishedImages, setPublishedImages] = useState([]);
  const [myImages, setMyImages] = useState([]);
  const [filter, setFilter] = useState("new");
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/api/gallery?sort=new"),
      api.get("/api/images")
    ])
      .then(([galleryData, imageData]) => {
        setPublishedImages((galleryData.images || []).filter(isUsablePublishedImage));
        setMyImages((imageData.images || []).filter((image) => image.status === "done" && isUsableImage(image)));
      })
      .catch((err) => setError(err.message));
  }, []);

  const realPublished = publishedImages.filter((image) => !image.demo);
  const visibleImages = useMemo(() => {
    if (filter === "mine") return myImages;
    return realPublished.length ? realPublished : showcaseImages;
  }, [filter, myImages, realPublished]);

  return (
    <div className="min-h-screen bg-[#1d1c1a] px-4 py-7 pb-24 text-[#f4f1ea] lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Generated work.</h1>
            <p className="mt-2 max-w-2xl text-[#aaa49a]">Published outputs and selected visual studies from Theo.</p>
          </div>
          <div className="segmented">
            <button className={filter === "new" ? "active" : ""} onClick={() => setFilter("new")}>New</button>
            <button className={filter === "mine" ? "active" : ""} onClick={() => setFilter("mine")}>Mine</button>
          </div>
        </header>

        {error && <p className="mb-4 border border-[#d9895f]/30 bg-[#d9895f]/10 px-3 py-2 text-sm text-[#efb18d]">{error}</p>}

        {visibleImages.length === 0 ? (
          <section className="border border-dashed border-white/15 bg-[#22211f] p-8 text-center sm:p-12">
            <p className="font-serif text-2xl text-[#e8dfd2] sm:text-3xl">Nothing here yet.</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#aaa49a]">
              Publish a completed image from Image Studio and it will appear here.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleImages.map((image) => (
              <GalleryCard key={image._id} image={image} onOpen={() => setSelectedImage(image)} />
            ))}
          </section>
        )}
      </div>

      {selectedImage && <ImageDetail image={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  );
}

function GalleryCard({ image, onOpen }) {
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPrompt(event) {
    event.stopPropagation();
    await navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <article className="overflow-hidden border border-white/10 bg-[#22211f] shadow-[0_20px_70px_rgba(0,0,0,0.16)]">
      <button className="block aspect-[4/5] w-full overflow-hidden bg-[#11110f] text-left" onClick={onOpen}>
        {!failed ? (
          <img
            src={image.thumbnailUrl || image.url}
            alt={image.prompt}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="grid h-full place-items-center p-8 text-center">
            <p className="font-serif text-2xl text-[#e8dfd2]">Preview unavailable</p>
          </div>
        )}
      </button>

      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">{image.published ? "Published" : "Private"}</p>
          {image.createdAt && <p className="text-xs text-[#8f887f]">{formatDate(image.createdAt)}</p>}
        </div>
        <p className="line-clamp-3 min-h-16 text-sm leading-6 text-[#c9c3ba]">{image.prompt}</p>

        <div className="flex gap-2">
          <button className="icon-btn flex-1" onClick={copyPrompt} title="Copy prompt">
            <Copy size={17} />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <a className="icon-btn flex-1" href={image.url} download title="Download" onClick={(event) => event.stopPropagation()}>
            <Download size={17} />
            <span>Download</span>
          </a>
        </div>
      </div>
    </article>
  );
}

function ImageDetail({ image, onClose }) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center sm:p-4" onClick={onClose}>
      <article className="grid max-h-[92vh] w-full max-w-5xl overflow-y-auto border border-white/10 bg-[#1d1c1a] shadow-2xl lg:grid-cols-[1.2fr_0.8fr]" onClick={(event) => event.stopPropagation()}>
        <div className="bg-[#11110f]">
          <img src={image.url} alt={image.prompt} className="max-h-[58vh] w-full object-contain lg:h-full lg:max-h-[90vh]" />
        </div>
        <div className="flex flex-col gap-5 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">{image.published ? "Published" : "Private"}</p>
              <h2 className="mt-2 text-2xl font-semibold">Image details</h2>
            </div>
            <button className="icon-btn" onClick={onClose} title="Close">
              <X size={17} />
            </button>
          </div>
          <p className="leading-7 text-[#d8d1c7]">{image.prompt}</p>
          <div className="mt-auto flex flex-col gap-2 sm:flex-row">
            <button className="icon-btn flex-1" onClick={copyPrompt}>
              <Copy size={17} />
              <span>{copied ? "Copied!" : "Copy prompt"}</span>
            </button>
            <a className="primary-btn flex-1" href={image.url} download>
              <Download size={17} />
              Download
            </a>
          </div>
        </div>
      </article>
    </div>
  );
}

function isUsablePublishedImage(image) {
  return image.published && image.status === "done" && isUsableImage(image);
}

function isUsableImage(image) {
  const url = image.thumbnailUrl || image.url || "";
  const errorText = `${image.error || ""} ${image.prompt || ""}`.toLowerCase();

  if (!url || image.status === "failed") return false;
  if (url.endsWith(".svg")) return false;
  if (errorText.includes("imagen is paid-only")) return false;
  if (errorText.includes("preview image")) return false;

  return true;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}
