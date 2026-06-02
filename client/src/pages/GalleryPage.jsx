import { Bookmark, Copy, Heart, Sparkles } from "lucide-react";
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

const showcaseImages = [
  {
    _id: "demo-01",
    prompt: "A premium monochrome AI workspace, black and ivory interface, soft editorial lighting, cinematic product shot",
    url: demoImageUrls[0],
    thumbnailUrl: demoImageUrls[0],
    user: { displayName: "Theo Studio" },
    likes: new Array(42),
    style: "editorial",
    demo: true
  },
  {
    _id: "demo-02",
    prompt: "A futuristic AI assistant dashboard floating in a quiet dark room, clean SaaS UI, beautiful typography",
    url: demoImageUrls[1],
    thumbnailUrl: demoImageUrls[1],
    user: { displayName: "Theo Studio" },
    likes: new Array(35),
    style: "interface",
    demo: true
  },
  {
    _id: "demo-03",
    prompt: "An elegant generated image studio for creators, dark product interface, warm ivory controls, gallery wall",
    url: demoImageUrls[2],
    thumbnailUrl: demoImageUrls[2],
    user: { displayName: "Theo Studio" },
    likes: new Array(28),
    style: "cinematic",
    demo: true
  },
  {
    _id: "demo-04",
    prompt: "A minimal AI brand poster for Theo, serif wordmark, black background, subtle glowing spark, premium editorial",
    url: demoImageUrls[3],
    thumbnailUrl: demoImageUrls[3],
    user: { displayName: "Theo Studio" },
    likes: new Array(51),
    style: "brand",
    demo: true
  },
  {
    _id: "demo-05",
    prompt: "A cinematic workstation for building products with AI, matte black desk, large clean interface, soft shadows",
    url: demoImageUrls[4],
    thumbnailUrl: demoImageUrls[4],
    user: { displayName: "Theo Studio" },
    likes: new Array(19),
    style: "cinematic",
    demo: true
  },
  {
    _id: "demo-06",
    prompt: "A refined app concept board with AI chat, image generation, and project notes, monochrome luxury SaaS",
    url: demoImageUrls[5],
    thumbnailUrl: demoImageUrls[5],
    user: { displayName: "Theo Studio" },
    likes: new Array(33),
    style: "interface",
    demo: true
  },
  {
    _id: "demo-07",
    prompt: "A quiet creative command center for AI workflows, dark workspace, precise panels, premium editorial finish",
    url: demoImageUrls[6],
    thumbnailUrl: demoImageUrls[6],
    user: { displayName: "Theo Studio" },
    likes: new Array(24),
    style: "workspace",
    demo: true
  },
  {
    _id: "demo-08",
    prompt: "A polished AI-generated concept visual with dramatic contrast, soft ivory highlights, and studio-grade framing",
    url: demoImageUrls[7],
    thumbnailUrl: demoImageUrls[7],
    user: { displayName: "Theo Studio" },
    likes: new Array(39),
    style: "concept",
    demo: true
  },
  {
    _id: "demo-09",
    prompt: "A refined product moodboard for an AI assistant, minimal cards, rich black background, clean visual hierarchy",
    url: demoImageUrls[8],
    thumbnailUrl: demoImageUrls[8],
    user: { displayName: "Theo Studio" },
    likes: new Array(31),
    style: "moodboard",
    demo: true
  },
  {
    _id: "demo-10",
    prompt: "A premium AI artwork preview with cinematic lighting, beautiful detail, and portfolio-ready composition",
    url: demoImageUrls[9],
    thumbnailUrl: demoImageUrls[9],
    user: { displayName: "Theo Studio" },
    likes: new Array(46),
    style: "showcase",
    demo: true
  }
];

export function GalleryPage() {
  const [images, setImages] = useState([]);
  const [sort, setSort] = useState("new");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/api/gallery?sort=${sort}`)
      .then((data) => setImages(data.images))
      .catch((err) => setError(err.message));
  }, [sort]);

  async function toggle(path, id) {
    if (id.startsWith("demo-")) return;
    const { image } = await api.post(`/api/gallery/${id}/${path}`, {});
    setImages((items) => items.map((item) => (item._id === id ? image : item)));
  }

  const usablePublishedImages = images.filter(isUsablePublishedImage);
  const visibleImages = [...showcaseImages, ...usablePublishedImages];

  return (
    <div className="min-h-screen bg-[#1d1c1a] px-4 py-7 pb-24 text-[#f4f1ea] lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">A living wall of generated work.</h1>
            <p className="mt-2 max-w-2xl text-[#aaa49a]">
              Published outputs from Theo users, with a curated AI showcase while the community board is still growing.
            </p>
          </div>
          <div className="segmented">
            <button className={sort === "new" ? "active" : ""} onClick={() => setSort("new")}>
              New
            </button>
            <button className={sort === "liked" ? "active" : ""} onClick={() => setSort("liked")}>
              Liked
            </button>
          </div>
        </header>

        {error && <p className="mb-4 rounded-xl border border-[#d9895f]/30 bg-[#d9895f]/10 px-3 py-2 text-sm text-[#efb18d]">{error}</p>}

        {!usablePublishedImages.length && (
          <div className="rounded-2xl border border-white/10 bg-[#22211f] px-4 py-3 text-sm text-[#c9c3ba]">
            Showing Theo Picks until published community images are available.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleImages.map((image) => (
            <GalleryCard key={image._id} image={image} onToggle={toggle} />
          ))}
        </section>
      </div>
    </div>
  );
}

function GalleryCard({ image, onToggle }) {
  const [failed, setFailed] = useState(false);

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/10 bg-[#22211f] shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#11110f]">
        {!failed ? (
          <img
            src={image.thumbnailUrl || image.url}
            alt={image.prompt}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="grid h-full place-items-center p-8 text-center">
            <Sparkles className="mx-auto mb-3 text-[#d9895f]" size={28} />
            <p className="font-serif text-2xl text-[#e8dfd2]">Preview loading</p>
            <p className="mt-2 text-sm text-[#8f887f]">The prompt is ready even if the image provider is slow.</p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#11110f] via-[#11110f]/72 to-transparent p-4">
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#e8dfd2]">
            {image.style || "generated"}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#2b2a27] text-[#f4f1ea]">
            <Sparkles size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold">{image.user?.displayName || "Theo user"}</p>
            <p className="text-xs text-[#8f887f]">{image.demo ? "Curated AI pick" : "Published generation"}</p>
          </div>
        </div>

        <p className="line-clamp-3 min-h-16 text-sm leading-6 text-[#c9c3ba]">{image.prompt}</p>

        <div className="flex gap-2">
          <button className="icon-btn flex-1" onClick={() => onToggle("like", image._id)} title="Like">
            <Heart size={17} />
            <span>{image.likes?.length || 0}</span>
          </button>
          <button className="icon-btn flex-1" onClick={() => onToggle("save", image._id)} title="Save" disabled={image.demo}>
            <Bookmark size={17} />
          </button>
          <button className="icon-btn flex-1" onClick={() => navigator.clipboard.writeText(image.prompt)} title="Copy prompt">
            <Copy size={17} />
          </button>
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
