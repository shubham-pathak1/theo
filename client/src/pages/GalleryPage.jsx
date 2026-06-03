import { Copy, Download } from "lucide-react";
import { useEffect, useState } from "react";
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
  demo: true
}));

export function GalleryPage() {
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/gallery?sort=new")
      .then((data) => setImages(data.images))
      .catch((err) => setError(err.message));
  }, []);

  const usablePublishedImages = images.filter(isUsablePublishedImage);
  const visibleImages = [...showcaseImages, ...usablePublishedImages];

  return (
    <div className="min-h-screen bg-[#1d1c1a] px-4 py-7 pb-24 text-[#f4f1ea] lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Generated work.</h1>
          <p className="mt-2 max-w-2xl text-[#aaa49a]">Published outputs and selected visual studies from Theo.</p>
        </header>

        {error && <p className="mb-4 border border-[#d9895f]/30 bg-[#d9895f]/10 px-3 py-2 text-sm text-[#efb18d]">{error}</p>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleImages.map((image) => (
            <GalleryCard key={image._id} image={image} />
          ))}
        </section>
      </div>
    </div>
  );
}

function GalleryCard({ image }) {
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <article className="overflow-hidden border border-white/10 bg-[#22211f] shadow-[0_20px_70px_rgba(0,0,0,0.16)]">
      <div className="aspect-[4/5] overflow-hidden bg-[#11110f]">
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
            <p className="mt-2 text-sm text-[#8f887f]">The prompt is still available.</p>
          </div>
        )}
      </div>

      <div className="space-y-4 p-4">
        <p className="line-clamp-3 min-h-16 text-sm leading-6 text-[#c9c3ba]">{image.prompt}</p>

        <div className="flex gap-2">
          <button className="icon-btn flex-1" onClick={copyPrompt} title="Copy prompt">
            <Copy size={17} />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <a className="icon-btn flex-1" href={image.url} download title="Download">
            <Download size={17} />
            <span>Download</span>
          </a>
        </div>
      </div>
    </article>
  );
}

function isUsablePublishedImage(image) {
  const url = image.thumbnailUrl || image.url || "";
  const errorText = `${image.error || ""} ${image.prompt || ""}`.toLowerCase();

  if (!url || image.status === "failed") return false;
  if (url.endsWith(".svg")) return false;
  if (errorText.includes("imagen is paid-only")) return false;
  if (errorText.includes("preview image")) return false;

  return true;
}
