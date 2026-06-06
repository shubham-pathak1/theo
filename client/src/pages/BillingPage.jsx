import { Clock, Crown, Image, MessageSquare, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "0",
    caption: "For trying Theo locally.",
    messages: 25,
    images: 5,
    icon: Sparkles,
    features: ["Theo Low and Medium access", "Basic image generations", "5-hour usage refresh"]
  },
  {
    id: "pro",
    name: "Pro",
    price: "199",
    caption: "For regular project work.",
    messages: 250,
    images: 50,
    icon: Zap,
    features: ["Higher chat limits", "Priority image queue", "Saved history and gallery publishing"],
    popular: true
  },
  {
    id: "max",
    name: "Max",
    price: "499",
    caption: "For heavy creative sessions.",
    messages: 1000,
    images: 200,
    icon: Crown,
    features: ["Largest usage window", "Theo High and XHigh tiers", "Best for demos and portfolio work"]
  }
];

function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-razorpay-checkout]");
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay Checkout could not load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Razorpay Checkout could not load."));
    document.body.appendChild(script);
  });
}

export function BillingPage() {
  const { user, updateUser } = useAuth();
  const [usage, setUsage] = useState(null);
  const [notice, setNotice] = useState("");
  const [busyPlan, setBusyPlan] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    loadBillingState();
  }, []);

  async function loadBillingState() {
    const [usageData, subscriptionData] = await Promise.all([
      api.get("/api/billing/usage"),
      api.get("/api/billing/subscriptions")
    ]);
    setUsage(usageData);
    setSubscriptions(subscriptionData.subscriptions || []);
  }

  async function subscribe(plan) {
    if (plan === "free") return;
    setBusyPlan(plan);
    setNotice("");

    try {
      const data = await api.post("/api/billing/subscribe", { plan });
      await loadRazorpayCheckout();
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: data.keyId,
          name: "Theo",
          description: `${plan.toUpperCase()} plan upgrade`,
          order_id: data.order.id,
          prefill: {
            name: user?.displayName || "",
            email: user?.email || ""
          },
          theme: {
            color: "#181715"
          },
          handler: async (response) => {
            try {
              const verified = await api.post("/api/billing/verify", {
                plan,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });
              updateUser(verified.user || { plan });
              setNotice(verified.message || `${plan} plan activated`);
              loadBillingState();
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Checkout closed before payment was completed."))
          }
        });

        checkout.on("payment.failed", (response) => {
          reject(new Error(response.error?.description || "Razorpay payment failed."));
        });

        checkout.open();
      });
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusyPlan("");
    }
  }

  async function cancelPlan() {
    setCancelling(true);
    setNotice("");
    try {
      const data = await api.post("/api/billing/cancel", {});
      updateUser(data.user || { plan: "free" });
      setNotice(data.message || "Subscription cancelled");
      loadBillingState();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1d1c1a] px-4 py-7 pb-24 text-[#f4f1ea] lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Usage that resets with your workflow.</h1>
            <p className="mt-2 max-w-2xl text-[#aaa49a]">
              Theo uses short usage windows, so limits recover every 5 hours instead of locking you out for the whole day.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#22211f] px-4 py-3 lg:min-w-56">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">Current plan</p>
            <p className="mt-1 text-2xl font-semibold capitalize">{user?.plan || "free"}</p>
            {user?.plan !== "free" && (
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-[#d9895f] hover:text-[#f0b58c] disabled:opacity-60"
                onClick={cancelPlan}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling" : "Cancel plan"}
              </button>
            )}
          </div>
        </header>

        {usage && (
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-[#22211f] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Active usage window</h2>
                  <p className="mt-1 text-sm text-[#8f887f]">Messages and image jobs share the current 5-hour cycle.</p>
                </div>
                <Clock className="text-[#d9895f]" size={24} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <UsageBar icon={MessageSquare} label="Messages" used={usage.used.messages} limit={usage.limits.messages} />
                <UsageBar icon={Image} label="Images" used={usage.used.images} limit={usage.limits.images} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#22211f] p-5">
              <ShieldCheck className="text-[#d9895f]" size={24} />
              <h2 className="mt-4 text-xl font-semibold">Payment billing</h2>
              <p className="mt-2 text-sm leading-6 text-[#aaa49a]">
                Plan changes are handled through Razorpay Checkout and applied after payment verification.
              </p>
              {usage?.resetAt && (
                <p className="mt-5 rounded-2xl border border-white/10 bg-[#181715] px-4 py-3 text-sm text-[#c9c3ba]">
                  Resets {new Date(usage.resetAt).toLocaleString()}.
                </p>
              )}
            </div>
          </section>
        )}

        {notice && <p className="rounded-xl border border-white/10 bg-[#252421] px-3 py-2 text-sm text-[#c9c3ba]">{notice}</p>}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`relative overflow-hidden rounded-3xl border p-5 ${
                plan.popular ? "border-[#d9895f]/50 bg-[#2a2420]" : "border-white/10 bg-[#22211f]"
              }`}
            >
              {plan.popular && (
                <span className="absolute right-5 top-5 rounded-full bg-[#d9895f] px-3 py-1 text-xs font-semibold text-[#171614]">
                  Popular
                </span>
              )}
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-[#181715] text-[#f4f1ea]">
                <plan.icon size={22} />
              </div>
              <h2 className="text-2xl font-semibold">{plan.name}</h2>
              <p className="mt-2 text-sm text-[#aaa49a]">{plan.caption}</p>
              <p className="mt-6 font-serif text-4xl text-[#e8dfd2] sm:text-5xl">
                Rs {plan.price}
                <span className="ml-2 align-middle text-sm font-sans text-[#8f887f]">/ month</span>
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <LimitPill icon={MessageSquare} value={plan.messages} label="messages" />
                <LimitPill icon={Image} value={plan.images} label="images" />
              </div>

              <ul className="mt-6 space-y-3 text-sm text-[#c9c3ba]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <ShieldCheck className="mt-0.5 shrink-0 text-[#d9895f]" size={16} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button className="primary-btn mt-7 w-full" onClick={() => subscribe(plan.id)} disabled={user?.plan === plan.id || Boolean(busyPlan)}>
                {user?.plan === plan.id ? "Current plan" : busyPlan === plan.id ? "Opening checkout" : plan.id === "free" ? "Included" : "Upgrade plan"}
              </button>
            </article>
          ))}
        </section>

        <section className="border border-white/10 bg-[#22211f]">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-xl font-semibold">Billing records</h2>
            <p className="mt-1 text-sm text-[#8f887f]">Recent plan payments from Razorpay.</p>
          </div>
          {subscriptions.length === 0 ? (
            <p className="p-5 text-sm text-[#8f887f]">No billing records yet.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {subscriptions.map((subscription) => (
                <div key={subscription._id} className="grid gap-3 p-5 text-sm md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p className="font-semibold capitalize">{subscription.plan} plan</p>
                    <p className="mt-1 text-xs text-[#8f887f]">
                      {subscription.providerPaymentId || subscription.providerOrderId || subscription.providerSubscriptionId || "No provider id"}
                    </p>
                  </div>
                  <span className="w-fit border border-white/10 bg-[#181715] px-3 py-1 text-xs font-semibold capitalize text-[#c9c3ba]">
                    {subscription.status}
                  </span>
                  <span className="text-xs text-[#8f887f]">{formatDate(subscription.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function UsageBar({ icon: Icon, label, used, limit }) {
  const percent = Math.min(100, Math.round((used / limit) * 100));
  const remaining = Math.max(0, limit - used);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#181715] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2b2a27]">
            <Icon size={18} />
          </div>
          <div>
            <p className="font-semibold">{label}</p>
            <p className="text-xs text-[#8f887f]">{remaining} remaining</p>
          </div>
        </div>
        <span className="text-sm text-[#c9c3ba]">{used} / {limit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-white/10">
        <div className="h-full bg-[#d9895f]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function LimitPill({ icon: Icon, value, label }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#181715] p-3">
      <Icon className="text-[#d9895f]" size={17} />
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="text-xs text-[#8f887f]">{label}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
