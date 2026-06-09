import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "0",
    caption: "For trying Theo.",
    messages: 25,
    images: 5,
    features: ["Theo Low and Medium access", "Basic image generations", "5-hour usage refresh"]
  },
  {
    id: "pro",
    name: "Pro",
    price: "199",
    caption: "For regular project work.",
    messages: 250,
    images: 50,
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
    features: ["Largest usage window", "Theo High and XHigh tiers", "Best for demos and portfolio work"]
  }
];

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
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

  useEffect(() => { loadBillingState(); }, []);

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
          prefill: { name: user?.displayName || "", email: user?.email || "" },
          theme: { color: "#181715" },
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
            } catch (error) { reject(error); }
          },
          modal: { ondismiss: () => reject(new Error("Checkout closed before payment was completed.")) }
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
    <div className="min-h-screen bg-[#1d1c1a] px-4 py-7 pb-24 text-[#f4f1ea] sm:px-6 lg:pb-10">
      <div className="space-y-10">

        {/* Header */}
        <header>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Plans & billing</h1>
          <p className="mt-2 text-[#aaa49a]">
            Usage resets every 5 hours.{" "}
            <span className="capitalize text-[#e8dfd2]">{user?.plan || "free"} plan</span>
            {user?.plan !== "free" && (
              <>
                {" · "}
                <button
                  type="button"
                  className="text-[#d9895f] hover:underline disabled:opacity-60"
                  onClick={cancelPlan}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling…" : "Cancel plan"}
                </button>
              </>
            )}
          </p>
        </header>

        {/* Usage */}
        {usage && (
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">Current usage</h2>
            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#22211f] p-5">
              <UsageBar label="Messages" used={usage.used.messages} limit={usage.limits.messages} />
              <UsageBar label="Images" used={usage.used.images} limit={usage.limits.images} />
              {usage?.resetAt && (
                <p className="pt-1 text-xs text-[#6b6560]">
                  Resets {new Date(usage.resetAt).toLocaleString()}
                </p>
              )}
            </div>
          </section>
        )}

        {notice && (
          <p className="rounded-xl border border-white/10 bg-[#252421] px-4 py-3 text-sm text-[#c9c3ba]">
            {notice}
          </p>
        )}

        {/* Plans */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">Plans</h2>
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#22211f] overflow-hidden">
            {plans.map((plan) => {
              const isCurrent = user?.plan === plan.id;
              return (
                <div key={plan.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#e8dfd2]">{plan.name}</p>
                      {plan.popular && (
                        <span className="rounded-full bg-[#d9895f]/15 px-2 py-0.5 text-xs font-medium text-[#d9895f]">
                          Popular
                        </span>
                      )}
                      {isCurrent && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-[#aaa49a]">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#8f887f]">{plan.caption}</p>
                    <ul className="mt-3 space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="text-sm text-[#c9c3ba]">— {f}</li>
                      ))}
                      <li className="text-sm text-[#c9c3ba]">— {plan.messages} messages / window</li>
                      <li className="text-sm text-[#c9c3ba]">— {plan.images} images / window</li>
                    </ul>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <p className="text-2xl font-semibold text-[#e8dfd2]">
                      {plan.price === "0" ? "Free" : `₹${plan.price}`}
                      {plan.price !== "0" && <span className="ml-1 text-sm font-normal text-[#8f887f]">/ mo</span>}
                    </p>
                    {plan.id !== "free" && (
                      <button
                        className="primary-btn text-sm"
                        onClick={() => subscribe(plan.id)}
                        disabled={isCurrent || Boolean(busyPlan)}
                      >
                        {isCurrent ? "Current plan" : busyPlan === plan.id ? "Opening…" : "Upgrade"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Billing records */}
        {subscriptions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">Billing records</h2>
            <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#22211f] overflow-hidden">
              {subscriptions.map((sub) => (
                <div key={sub._id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                  <div>
                    <p className="font-medium capitalize text-[#e8dfd2]">{sub.plan} plan</p>
                    <p className="mt-0.5 text-xs text-[#6b6560]">
                      {sub.providerPaymentId || sub.providerOrderId || sub.providerSubscriptionId || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#8f887f]">
                    <span className="capitalize">{sub.status}</span>
                    <span>{formatDate(sub.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

function UsageBar({ label, used, limit }) {
  const percent = Math.min(100, Math.round((used / limit) * 100));
  const remaining = Math.max(0, limit - used);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#c9c3ba]">{label}</span>
        <span className="text-[#8f887f]">{remaining} remaining <span className="text-[#6b6560]">/ {limit}</span></span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#d9895f] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
