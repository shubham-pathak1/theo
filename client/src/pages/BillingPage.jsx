import { Crown, Gauge, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const plans = [
  { id: "free", name: "Free", price: "0", messages: 25, images: 5, icon: Gauge },
  { id: "pro", name: "Pro", price: "499", messages: 250, images: 50, icon: Zap },
  { id: "max", name: "Max", price: "999", messages: 1000, images: 200, icon: Crown }
];

export function BillingPage() {
  const { user, updateUser } = useAuth();
  const [usage, setUsage] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.get("/api/billing/usage").then(setUsage);
  }, []);

  async function subscribe(plan) {
    if (plan === "free") return;
    try {
      const data = await api.post("/api/billing/subscribe", { plan });
      updateUser({ plan });
      setNotice(data.demo ? data.message : `Razorpay subscription created: ${data.subscription.id}`);
      api.get("/api/billing/usage").then(setUsage);
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-24 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Plans and Usage</h1>
          <p className="mt-2 text-ink/60 dark:text-paper/60">
            Current plan: {user?.plan}. Limits reset every 5 hours.
          </p>
        </header>

        {usage && (
          <section className="mb-6 grid gap-4 md:grid-cols-2">
            <UsageBar label="Messages" used={usage.used.messages} limit={usage.limits.messages} />
            <UsageBar label="Images" used={usage.used.images} limit={usage.limits.images} />
          </section>
        )}

        {usage?.resetAt && (
          <p className="mb-4 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-paper/70">
            Current usage window resets at {new Date(usage.resetAt).toLocaleString()}.
          </p>
        )}

        {notice && <p className="mb-4 rounded-md border border-ocean/30 bg-ocean/10 px-3 py-2 text-sm text-ocean">{notice}</p>}

        <section className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className="rounded-md border border-line bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <div className="mb-5 flex items-center justify-between">
                <plan.icon />
                {user?.plan === plan.id && <span className="rounded-md bg-moss/10 px-2 py-1 text-xs font-semibold text-moss">Active</span>}
              </div>
              <h2 className="text-2xl font-semibold">{plan.name}</h2>
              <p className="mt-2 text-3xl font-semibold">Rs {plan.price}</p>
              <p className="mt-4 text-sm text-ink/60 dark:text-paper/60">
                {plan.messages} messages/day and {plan.images} images/day.
              </p>
              <button className="primary-btn mt-6 w-full" onClick={() => subscribe(plan.id)} disabled={user?.plan === plan.id}>
                {plan.id === "free" ? "Included" : "Upgrade"}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

function UsageBar({ label, used, limit }) {
  const percent = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="rounded-md border border-line bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span>
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-line dark:bg-white/10">
        <div className="h-full bg-ocean" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
