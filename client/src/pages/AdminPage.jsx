import {
  BadgeCheck,
  Ban,
  BarChart3,
  CreditCard,
  Image as ImageIcon,
  Trash2,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

const plans = ["free", "pro", "max"];
const roles = ["user", "admin"];
const imageStatuses = ["all", "queued", "processing", "done", "failed", "cancelled"];

export function AdminPage() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [images, setImages] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [userFilters, setUserFilters] = useState({ q: "", plan: "all", role: "all" });
  const [imageStatus, setImageStatus] = useState("all");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdmin();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [userFilters.plan, userFilters.role]);

  useEffect(() => {
    loadImages();
  }, [imageStatus]);

  async function loadAdmin() {
    setLoading(true);
    setNotice("");
    try {
      const [overviewData, usersData, imagesData, subscriptionsData] = await Promise.all([
        api.get("/api/admin/overview"),
        api.get("/api/admin/users"),
        api.get("/api/admin/images"),
        api.get("/api/admin/subscriptions")
      ]);
      setOverview(overviewData);
      setUsers(usersData.users || []);
      setImages(imagesData.images || []);
      setSubscriptions(subscriptionsData.subscriptions || []);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    const params = new URLSearchParams();
    if (userFilters.q.trim()) params.set("q", userFilters.q.trim());
    params.set("plan", userFilters.plan);
    params.set("role", userFilters.role);
    const data = await api.get(`/api/admin/users?${params.toString()}`);
    setUsers(data.users || []);
  }

  async function loadImages() {
    const data = await api.get(`/api/admin/images?status=${imageStatus}`);
    setImages(data.images || []);
  }

  async function updateUser(userId, patch) {
    try {
      const data = await api.patch(`/api/admin/users/${userId}`, patch);
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...data.user } : user)));
      setNotice("User updated.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function togglePublish(imageId) {
    try {
      const data = await api.patch(`/api/admin/images/${imageId}/publish`, {});
      setImages((current) => current.map((image) => (image.id === imageId ? data.image : image)));
      setNotice(data.image.published ? "Image published." : "Image unpublished.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function deleteImage(imageId) {
    try {
      await api.delete(`/api/admin/images/${imageId}`);
      setImages((current) => current.filter((image) => image.id !== imageId));
      setNotice("Image deleted.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  const planRows = useMemo(() => overview?.breakdowns?.usersByPlan || {}, [overview]);
  const statusRows = useMemo(() => overview?.breakdowns?.imagesByStatus || {}, [overview]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#1d1c1a] text-[#aaa49a]">
        Loading admin dashboard
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1d1c1a] px-4 py-7 pb-24 text-[#f4f1ea] lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#8f887f]">Admin</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Workspace control.</h1>
            <p className="mt-2 max-w-2xl text-[#aaa49a]">
              Monitor users, billing, image jobs, and system health without exposing private conversations.
            </p>
          </div>
          <button className="icon-btn" onClick={loadAdmin}>
            Refresh
          </button>
        </header>

        {notice && <p className="rounded-xl border border-white/10 bg-[#252421] px-3 py-2 text-sm text-[#c9c3ba]">{notice}</p>}

        {overview && (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon={Users} label="Users" value={overview.totals.users} note={`${overview.totals.verifiedUsers} verified`} />
              <MetricCard icon={BarChart3} label="Chats" value={overview.totals.conversations} note="aggregate only" />
              <MetricCard icon={ImageIcon} label="Images" value={overview.totals.images} note={`${overview.totals.publishedImages} published`} />
              <MetricCard icon={CreditCard} label="Active subs" value={overview.totals.activeSubscriptions} note="created or active" />
              <MetricCard icon={Ban} label="Failures 24h" value={overview.activity.failedImages24h} note={`${overview.activity.images24h} image jobs`} />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Breakdown title="Plans" rows={plans.map((plan) => [plan, planRows[plan] || 0])} />
              <Breakdown title="Image jobs" rows={imageStatuses.filter((status) => status !== "all").map((status) => [status, statusRows[status] || 0])} />
            </section>
          </>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#22211f]">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Users</h2>
              <p className="mt-1 text-sm text-[#8f887f]">Manage role, plan, verification state, and usage footprint.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="h-10 rounded-xl border border-white/10 bg-[#181715] px-3 text-sm outline-none placeholder:text-[#8f887f] focus:border-white/30"
                placeholder="Search users"
                value={userFilters.q}
                onChange={(event) => setUserFilters((current) => ({ ...current, q: event.target.value }))}
                onKeyDown={(event) => event.key === "Enter" && loadUsers()}
              />
              <FilterSelect value={userFilters.plan} options={["all", ...plans]} onChange={(plan) => setUserFilters((current) => ({ ...current, plan }))} />
              <FilterSelect value={userFilters.role} options={["all", ...roles]} onChange={(role) => setUserFilters((current) => ({ ...current, role }))} />
              <button className="icon-btn" onClick={loadUsers}>Search</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-[#8f887f]">
                <tr>
                  <Th>User</Th>
                  <Th>Plan</Th>
                  <Th>Role</Th>
                  <Th>Usage</Th>
                  <Th>Joined</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((user) => (
                  <tr key={user.id}>
                    <Td>
                      <div className="font-semibold">{user.displayName}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#8f887f]">
                        <span>{user.email}</span>
                        {user.emailVerified ? <BadgeCheck size={14} className="text-emerald-300" /> : <Ban size={14} className="text-[#d9895f]" />}
                      </div>
                    </Td>
                    <Td>
                      <FilterSelect value={user.plan} options={plans} onChange={(plan) => updateUser(user.id, { plan })} compact />
                    </Td>
                    <Td>
                      <FilterSelect value={user.role} options={roles} onChange={(role) => updateUser(user.id, { role })} compact />
                    </Td>
                    <Td>
                      <span>{user.conversations} chats</span>
                      <span className="mx-2 text-[#55504a]">/</span>
                      <span>{user.images} images</span>
                    </Td>
                    <Td>{formatDate(user.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-white/10 bg-[#22211f]">
            <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Image jobs</h2>
                <p className="mt-1 text-sm text-[#8f887f]">Review generation state and gallery publishing.</p>
              </div>
              <FilterSelect value={imageStatus} options={imageStatuses} onChange={setImageStatus} />
            </div>
            <div className="divide-y divide-white/10">
              {images.map((image) => (
                <article key={image.id} className="grid gap-4 p-4 lg:grid-cols-[112px_1fr_auto]">
                  <div className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-[#181715]">
                    {image.url ? (
                      <img src={image.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-[#6f6960]">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill value={image.status} />
                      {image.published && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">published</span>}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-[#e8dfd2]">{image.prompt}</p>
                    <p className="mt-2 text-xs text-[#8f887f]">
                      {image.user?.displayName || "Unknown user"} / {image.provider || "local"} / {formatDate(image.createdAt)}
                    </p>
                    {image.error && <p className="mt-2 text-xs text-[#d9895f]">{image.error}</p>}
                  </div>
                  <div className="flex items-center gap-2 lg:justify-end">
                    <button className="icon-btn" onClick={() => togglePublish(image.id)}>
                      {image.published ? "Unpublish" : "Publish"}
                    </button>
                    <button className="icon-btn" onClick={() => deleteImage(image.id)} title="Delete image">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#22211f]">
            <div className="border-b border-white/10 p-4">
              <h2 className="text-xl font-semibold">Subscriptions</h2>
              <p className="mt-1 text-sm text-[#8f887f]">Latest Razorpay and demo billing records.</p>
            </div>
            <div className="divide-y divide-white/10">
              {subscriptions.map((subscription) => (
                <article key={subscription.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold capitalize">{subscription.plan} plan</p>
                      <p className="mt-1 text-xs text-[#8f887f]">{subscription.user?.email || "Unknown user"}</p>
                    </div>
                    <StatusPill value={subscription.status} />
                  </div>
                  <p className="mt-3 truncate text-xs text-[#8f887f]">{subscription.providerSubscriptionId}</p>
                  <p className="mt-2 text-xs text-[#6f6960]">{formatDate(subscription.createdAt)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, note }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#22211f] p-4">
      <div className="mb-5 grid h-10 w-10 place-items-center rounded-xl bg-[#181715] text-[#e8dfd2]">
        <Icon size={19} />
      </div>
      <p className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[#8f887f]">{note}</p>
    </article>
  );
}

function Breakdown({ title, rows }) {
  const total = rows.reduce((sum, [, value]) => sum + value, 0) || 1;
  return (
    <article className="rounded-2xl border border-white/10 bg-[#22211f] p-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-5 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="capitalize text-[#c9c3ba]">{label}</span>
              <span className="text-[#8f887f]">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#f4f1ea]" style={{ width: `${Math.max(4, (value / total) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function FilterSelect({ value, options, onChange, compact = false }) {
  return (
    <select
      className={`${compact ? "h-9" : "h-10"} rounded-xl border border-white/10 bg-[#181715] px-3 text-sm capitalize text-[#f4f1ea] outline-none focus:border-white/30`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function StatusPill({ value }) {
  const good = ["done", "active", "activated", "authenticated"].includes(value);
  const bad = ["failed", "cancelled"].includes(value);
  return (
    <span className={`rounded-full px-2 py-1 text-xs capitalize ${good ? "bg-emerald-400/10 text-emerald-200" : bad ? "bg-[#d9895f]/15 text-[#f0b58c]" : "bg-white/10 text-[#c9c3ba]"}`}>
      {value}
    </span>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function Td({ children }) {
  return <td className="px-4 py-4 align-top text-[#c9c3ba]">{children}</td>;
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
