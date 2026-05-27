import { Copy, Heart, Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

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
    const { image } = await api.post(`/api/gallery/${id}/${path}`, {});
    setImages((items) => items.map((item) => (item._id === id ? image : item)));
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-24 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Community Gallery</h1>
            <p className="mt-2 text-ink/60 dark:text-paper/60">Published generations from Theo users.</p>
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

        {error && <p className="mb-4 rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {images.map((image) => (
            <article key={image._id} className="overflow-hidden rounded-md border border-line bg-white dark:border-white/10 dark:bg-white/5">
              <img src={image.thumbnailUrl || image.url} alt={image.prompt} className="aspect-square w-full object-cover" />
              <div className="space-y-3 p-3">
                <div className="flex items-center gap-2">
                  {image.user?.avatarUrl && <img src={image.user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />}
                  <span className="text-sm font-semibold">{image.user?.displayName || "Theo user"}</span>
                </div>
                <p className="line-clamp-3 text-sm text-ink/70 dark:text-paper/70">{image.prompt}</p>
                <div className="flex gap-2">
                  <button className="icon-btn flex-1" onClick={() => toggle("like", image._id)} title="Like">
                    <Heart size={17} />
                    <span>{image.likes?.length || 0}</span>
                  </button>
                  <button className="icon-btn flex-1" onClick={() => toggle("save", image._id)} title="Save">
                    <Bookmark size={17} />
                  </button>
                  <button className="icon-btn flex-1" onClick={() => navigator.clipboard.writeText(image.prompt)} title="Copy prompt">
                    <Copy size={17} />
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
