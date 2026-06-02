import {
  Bot,
  Check,
  ChevronDown,
  Circle,
  Code2,
  Image,
  MessageSquare,
  Plus,
  Sparkle,
  Zap
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const plans = [
  {
    name: "Free",
    price: "Rs 0",
    subtitle: "For trying Theo",
    features: [
      "Streaming AI chat",
      "Generate images from prompts",
      "Save conversation history",
      "Publish to community gallery",
      "Markdown and code rendering",
      "5-hour usage windows"
    ]
  },
  {
    name: "Pro",
    price: "Rs 499",
    subtitle: "For everyday creation",
    featured: true,
    features: [
      "Everything in Free",
      "Higher message limits",
      "More image generations",
      "Priority image queue",
      "Custom instructions",
      "Razorpay subscription billing"
    ]
  },
  {
    name: "Max",
    price: "Rs 999",
    subtitle: "For heavy builders",
    features: [
      "Everything in Pro",
      "Highest daily limits",
      "Early feature access",
      "Advanced gallery tools",
      "Usage analytics",
      "Priority support lane"
    ]
  }
];

const footerColumns = [
  ["Product", "Chat", "Image Studio", "Gallery", "Pricing", "Settings"],
  ["Platform", "Gemini", "BullMQ", "Redis limits", "Cloudinary", "Razorpay"],
  ["Resources", "Docs", "API status", "Examples", "Changelog", "Support"],
  ["Company", "About", "Security", "Terms", "Privacy", "Contact"]
];

export function AuthPage() {
  const { user, login, register, googleLogin } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleStatus, setGoogleStatus] = useState("Checking Google Sign-In...");
  const googleButtonRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGoogleButton() {
      const config = await api.get("/api/auth/google-config");
      if (cancelled || !config.enabled || !config.clientId) {
        setGoogleEnabled(false);
        setGoogleStatus("Google Sign-In is not configured");
        return;
      }

      setGoogleEnabled(true);
      setGoogleStatus("");

      await new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }

        const existing = document.querySelector("script[data-google-identity]");
        if (existing) {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", reject, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = "true";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      if (cancelled || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: config.clientId,
        callback: async (response) => {
          setError("");
          setNotice("");
          try {
            await googleLogin(response.credential);
          } catch (err) {
            setError(err.message);
          }
        }
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        width: 360,
        text: mode === "login" ? "continue_with" : "signup_with"
      });
    }

    loadGoogleButton().catch(() => {
      if (!cancelled) {
        setGoogleEnabled(false);
        setGoogleStatus("Google Sign-In could not load");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [googleLogin, mode]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function forgotPassword() {
    setError("");
    setNotice("");
    if (!form.email) {
      setError("Enter your email first.");
      return;
    }

    try {
      const data = await api.post("/api/auth/forgot-password", { email: form.email });
      setNotice(data.devResetUrl ? `Dev reset link: ${data.devResetUrl}` : data.message || "If the email exists, a reset link has been created.");
    } catch (err) {
      setError(err.message || "Could not request password reset.");
    }
  }

  return (
    <div className="min-h-screen bg-[#11110f] text-[#f6f1e8]">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2 text-xl font-semibold">
          <Sparkle className="text-[#d9895f]" size={21} fill="currentColor" />
          Theo
        </a>

        <nav className="hidden items-center gap-7 text-sm text-[#f6f1e8]/70 lg:flex">
          {["Meet Theo", "Platform", "Solutions", "Pricing", "Resources"].map((item) => (
            <a key={item} href={item === "Pricing" ? "#pricing" : "#top"} className="inline-flex items-center gap-1 hover:text-[#f6f1e8]">
              {item}
              <ChevronDown size={13} />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a href="mailto:sales@theo.local" className="hidden rounded-md bg-black px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 sm:inline-flex">
            Contact sales
          </a>
          <a href="#signin" className="rounded-md bg-[#f6f1e8] px-4 py-2 text-sm font-semibold text-[#161512]">
            Try Theo
          </a>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-28 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pt-6">
          <div className="mx-auto w-full max-w-md lg:mx-0 lg:pl-14">
            <h1 className="font-serif text-5xl leading-[0.95] tracking-normal text-[#f8f3ea] md:text-6xl">
              Think clearly,
              <br />
              build faster
            </h1>
            <p className="mt-5 text-base text-[#f8f3ea]/80">Brainstorm in chat, generate images, and ship ideas from one workspace.</p>

            <form
              id="signin"
              className="mt-8 rounded-2xl border border-white/10 bg-[#171714] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
              onSubmit={submit}
            >
              <div className="mb-4 grid grid-cols-2 rounded-md bg-white/5 p-1">
                <button
                  type="button"
                  className={`min-h-9 rounded text-sm font-semibold transition ${mode === "login" ? "bg-[#f6f1e8] text-[#161512]" : "text-[#f6f1e8]/60"}`}
                  onClick={() => setMode("login")}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={`min-h-9 rounded text-sm font-semibold transition ${mode === "register" ? "bg-[#f6f1e8] text-[#161512]" : "text-[#f6f1e8]/60"}`}
                  onClick={() => setMode("register")}
                >
                  Sign up
                </button>
              </div>

              <div className="grid min-h-11 place-items-center rounded-md border border-white/15 bg-white px-2 py-1">
                <div ref={googleButtonRef} />
                {!googleEnabled && (
                  <p className="flex items-center gap-2 text-sm font-semibold text-[#161512]">
                    <GoogleMark />
                    {googleStatus}
                  </p>
                )}
              </div>

              <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[#f6f1e8]/35">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="space-y-3">
                {mode === "register" && (
                  <input
                    className="h-11 w-full rounded-md border border-white/10 bg-[#2a2925] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#d9895f]"
                    placeholder="Your name"
                    value={form.displayName}
                    onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                  />
                )}
                <input
                  className="h-11 w-full rounded-md border border-white/10 bg-[#2a2925] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#d9895f]"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
                <input
                  className="h-11 w-full rounded-md border border-white/10 bg-[#2a2925] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#d9895f]"
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
              </div>

              {error && <p className="mt-3 rounded-md border border-[#d9895f]/30 bg-[#d9895f]/10 px-3 py-2 text-sm text-[#f0b18e]">{error}</p>}
              {notice && <p className="mt-3 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70">{notice}</p>}

              <button className="mt-4 h-11 w-full rounded-md bg-[#f6f1e8] text-sm font-semibold text-[#161512] transition hover:bg-white">
                Continue with email
              </button>
              {mode === "login" && (
                <button
                  type="button"
                  className="mt-3 w-full text-center text-sm font-medium text-[#f6f1e8]/55 hover:text-[#f6f1e8]"
                  onClick={forgotPassword}
                >
                  Send password reset link
                </button>
              )}
            </form>
          </div>

          <div className="mx-auto w-full max-w-[640px] rounded-2xl border border-white/15 bg-black p-6 shadow-[0_28px_100px_rgba(0,0,0,0.7)] lg:mr-0">
            <div className="rounded-[28px] bg-[#f4f0ea] p-8 text-[#15130f] md:p-10">
              <div className="mb-7 flex items-center justify-between">
                <h2 className="font-serif text-4xl">Theo</h2>
                <span className="rounded-full bg-[#15130f] px-3 py-1 text-xs font-semibold text-[#f4f0ea]">Live workspace</span>
              </div>

              <div className="mb-8 flex items-center gap-4">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#15130f] text-[#f4f0ea]">
                  <Plus size={20} />
                </div>
                <span className="text-xl font-medium">New task</span>
              </div>

              <div className="space-y-6 text-xl">
                <PreviewRow icon={MessageSquare} text="Draft launch plan for AI image gallery" active />
                <PreviewRow icon={Code2} text="Explain refresh token rotation" active />
                <PreviewRow icon={Image} text="Generate cinematic app hero image" active />
                <PreviewRow icon={Bot} text="Analyze subscription usage limits" loading />
                <PreviewRow icon={Zap} text="Refactor BullMQ worker flow" active />
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-5 pb-28">
          <div className="text-center">
            <h2 className="font-serif text-3xl">Explore plans</h2>
            <div className="mt-6 inline-flex rounded-md bg-white/8 p-1">
              <button className="rounded bg-[#2b2925] px-5 py-2 text-sm font-semibold text-white">Individual</button>
              <button className="px-5 py-2 text-sm font-semibold text-white/50">Team</button>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-2xl border bg-[#1f1d1a] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.28)] ${
                  plan.featured ? "border-[#547b96]" : "border-white/12"
                }`}
              >
                <div className="mb-10 text-[#f6f1e8]/80">
                  <PlanMark />
                </div>
                <h3 className="font-serif text-3xl">{plan.name}</h3>
                <p className="mt-1 text-sm text-white/70">{plan.subtitle}</p>
                <p className="mt-7 text-2xl font-semibold">{plan.price}</p>
                <p className="mt-1 text-xs text-white/45">Per month while active</p>
                <a href="#signin" className="mt-7 flex h-11 items-center justify-center rounded-md bg-[#f6f1e8] text-sm font-semibold text-[#161512]">
                  Try Theo
                </a>
                <div className="my-8 h-px bg-white/10" />
                <ul className="space-y-4 text-sm text-white/74">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <Check className="mt-0.5 shrink-0" size={15} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-5 pb-28">
          <h2 className="text-center font-serif text-3xl">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-white/10">
            {[
              "What is Theo and how does it work?",
              "What should I use Theo for?",
              "How much does it cost to use?",
              "Can I publish generated images?"
            ].map((question) => (
              <button key={question} className="flex w-full items-center justify-between py-4 text-left font-serif text-xl text-[#f6f1e8]/82">
                {question}
                <Plus size={18} />
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black px-5 py-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.2fr_3fr]">
          <div className="flex min-h-72 flex-col justify-between">
            <a href="#top" className="flex items-center gap-2 text-xl font-semibold">
              <Sparkle className="text-[#d9895f]" size={21} fill="currentColor" />
              Theo
            </a>
            <p className="text-xs uppercase tracking-[0.18em] text-white/50">Built as a full-stack AI SaaS</p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {footerColumns.map(([title, ...links]) => (
              <div key={title}>
                <h3 className="mb-4 text-sm font-semibold text-white/70">{title}</h3>
                <ul className="space-y-3 text-sm text-white/45">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#top" className="hover:text-white">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4 20.56 7.74 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.74 1 4 3.44 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function PreviewRow({ icon: Icon, text, active, loading }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <div className={`flex items-center gap-4 ${loading ? "text-[#15130f]" : "text-[#15130f]/58"}`}>
        <Icon size={22} />
        <span>{text}</span>
      </div>
      {loading ? <Circle className="animate-spin text-[#bdb8ae]" size={30} /> : <span className={`h-3 w-3 rounded-full ${active ? "bg-[#2d83d4]" : "bg-[#c8c2b8]"}`} />}
    </div>
  );
}

function PlanMark() {
  return (
    <div className="relative h-12 w-12">
      <span className="absolute left-5 top-0 h-12 w-px bg-current" />
      <span className="absolute left-0 top-5 h-px w-12 bg-current" />
      <span className="absolute left-[17px] top-[17px] h-3 w-3 rounded-full border border-current bg-[#1f1d1a]" />
      <span className="absolute left-0 top-[17px] h-3 w-3 rounded-full border border-current bg-[#1f1d1a]" />
      <span className="absolute right-0 top-[17px] h-3 w-3 rounded-full border border-current bg-[#1f1d1a]" />
      <span className="absolute left-[17px] top-0 h-3 w-3 rounded-full border border-current bg-[#1f1d1a]" />
    </div>
  );
}
