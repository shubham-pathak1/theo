import {
  Bot,
  Check,
  ChevronDown,
  Circle,
  Code2,
  Image,
  MessageSquare,
  Plus,
  Zap
} from "lucide-react";
import { useEffect, useState } from "react";
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
    price: "Rs 199",
    subtitle: "For everyday creation",
    featured: true,
    features: [
      "Everything in Free",
      "Higher message limits",
      "More image generations",
      "Priority image queue",
      "Custom instructions",
      "Payment billing"
    ]
  },
  {
    name: "Max",
    price: "Rs 499",
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

const navItems = [
  { label: "Meet Theo", href: "#top" },
  {
    label: "Product",
    items: [
      { label: "Chat", note: "Streaming conversations", href: "/" },
      { label: "Image Studio", note: "Prompt and generate visuals", href: "/images" },
      { label: "Gallery", note: "Browse published work", href: "/gallery" },
      { label: "Settings", note: "Profile and instructions", href: "/settings" }
    ]
  },
  {
    label: "Workspace",
    items: [
      { label: "Conversations", note: "Saved chat history", href: "/" },
      { label: "Image history", note: "Review every request", href: "/images" },
      { label: "Published work", note: "Curated visual studies", href: "/gallery" },
      { label: "Usage limits", note: "Plans with refresh windows", href: "/billing" }
    ]
  },
  {
    label: "Pricing",
    items: [
      { label: "Free", note: "Start with the basics", href: "#pricing" },
      { label: "Pro", note: "More room for daily work", href: "#pricing" },
      { label: "Max", note: "Highest workspace limits", href: "#pricing" }
    ]
  },
  {
    label: "Resources",
    items: [
      { label: "FAQ", note: "Common questions", href: "#faq" },
      { label: "Docs", note: "Product notes", href: "/docs" },
      { label: "Examples", note: "Ways to use Theo", href: "/examples" },
      { label: "Changelog", note: "Recent improvements", href: "/changelog" },
      { label: "Support", note: "Get help", href: "/support" }
    ]
  }
];

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Chat", href: "/" },
      { label: "Image Studio", href: "/images" },
      { label: "Gallery", href: "/gallery" },
      { label: "Pricing", href: "#pricing" },
      { label: "Settings", href: "/settings" }
    ]
  },
  {
    title: "Workspace",
    links: [
      { label: "Conversations", href: "/" },
      { label: "Image history", href: "/images" },
      { label: "Published work", href: "/gallery" },
      { label: "Usage limits", href: "/billing" },
      { label: "Account", href: "/settings" }
    ]
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Status", href: "/status" },
      { label: "Examples", href: "/examples" },
      { label: "Changelog", href: "/changelog" },
      { label: "Support", href: "/support" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Security", href: "/security" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Contact", href: "/contact" }
    ]
  }
];

const faqItems = [
  {
    question: "What is Theo and how does it work?",
    answer:
      "Theo is a focused AI workspace for chat, image prompts, saved conversations, and published visual work. You sign in, start a conversation or image request, and Theo keeps the output organized in your workspace."
  },
  {
    question: "What should I use Theo for?",
    answer:
      "Use it for brainstorming, writing, code questions, product planning, prompt drafting, and keeping visual ideas in one place instead of scattering them across separate tools."
  },
  {
    question: "How much does it cost to use?",
    answer:
      "Theo has a free plan for testing the workspace and paid-style Pro and Max plans for higher limits. Usage refreshes in windows so the product stays predictable while you work."
  },
  {
    question: "Can I publish generated images?",
    answer:
      "Yes. Completed images can be saved to your history and published to the gallery when you want to share a polished output."
  }
];

export function AuthPage() {
  const { user, login, register, googleLogin } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleStatus, setGoogleStatus] = useState("Checking Google Sign-In...");
  const [googleClientId, setGoogleClientId] = useState("");
  const [openMenu, setOpenMenu] = useState("");
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadGoogleConfig() {
      const config = await api.get("/api/auth/google-config");
      setGoogleClientId(config.clientId || "");
      if (cancelled || !config.enabled || !config.clientId) {
        setGoogleEnabled(false);
        setGoogleStatus("Google Sign-In is not configured");
        return;
      }

      setGoogleEnabled(true);
      setGoogleStatus("");
    }

    loadGoogleConfig().catch(() => {
      if (!cancelled) {
        setGoogleEnabled(false);
        setGoogleStatus("Google Sign-In could not load");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;
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
    setResetUrl("");
    if (!form.email) {
      setError("Enter your email first.");
      return;
    }

    try {
      const data = await api.post("/api/auth/forgot-password", { email: form.email });
      setResetUrl(data.devResetUrl || "");
      setNotice(data.message || "If the email exists, a reset link has been created.");
    } catch (err) {
      setError(err.message || "Could not request password reset.");
    }
  }

  async function fallbackGoogleLogin() {
    setError("");
    setNotice("");
    if (!googleClientId) {
      setError("Google client ID is not available. Restart the backend and check GOOGLE_CLIENT_ID.");
      return;
    }

    const nonce = crypto.randomUUID();
    const redirectUri = `${window.location.origin}/auth`;
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", googleClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "id_token");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("nonce", nonce);

    const popup = window.open(url.toString(), "theo_google_login", "width=460,height=640");
    if (!popup) {
      setError("Google popup was blocked by the browser.");
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        if (popup.closed) {
          window.clearInterval(timer);
          return;
        }

        const hash = popup.location.hash;
        if (!hash) return;

        const params = new URLSearchParams(hash.slice(1));
        const idToken = params.get("id_token");
        const oauthError = params.get("error");
        if (oauthError) {
          popup.close();
          window.clearInterval(timer);
          setError(`Google Sign-In failed: ${oauthError}`);
          return;
        }

        if (idToken) {
          popup.close();
          window.clearInterval(timer);
          await googleLogin(idToken);
        }
      } catch {
        // Ignore cross-origin access until Google redirects back to localhost.
      }
    }, 400);
  }

  return (
    <div className="min-h-screen bg-[#11110f] text-[#f6f1e8]">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2 text-xl font-semibold">
          <img src="/favicon.svg" alt="" className="h-6 w-6" />
          Theo
        </a>

        <nav className="relative hidden items-center gap-7 text-sm text-[#f6f1e8]/70 lg:flex">
          {navItems.map((item) => (
            item.items ? (
              <div key={item.label} className="relative">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 transition hover:text-[#f6f1e8]"
                  onClick={() => setOpenMenu(openMenu === item.label ? "" : item.label)}
                >
                  {item.label}
                  <ChevronDown className={`transition ${openMenu === item.label ? "rotate-180" : ""}`} size={13} />
                </button>
                {openMenu === item.label && (
                  <div className="absolute left-0 top-8 z-30 w-72 rounded-xl border border-white/10 bg-[#1f1e1b] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
                    <div className="space-y-1">
                      {item.items.map((link) => (
                        <a
                          key={link.label}
                          href={link.href}
                          className="block rounded-lg px-3 py-2.5 transition hover:bg-white/7 hover:text-white"
                          onClick={() => setOpenMenu("")}
                        >
                          <span className="block text-sm font-semibold text-[#f6f1e8]">{link.label}</span>
                          <span className="mt-0.5 block text-xs text-[#f6f1e8]/45">{link.note}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <a key={item.label} href={item.href} className="transition hover:text-[#f6f1e8]">
                {item.label}
              </a>
            )
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
        <section className="mx-auto grid max-w-7xl gap-7 px-4 pb-14 pt-6 sm:px-5 sm:pb-20 sm:pt-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10 lg:pb-28 lg:pt-6">
          <div className="mx-auto w-full max-w-md lg:mx-0 lg:pl-14">
            <h1 className="font-serif text-[2.6rem] leading-[0.95] tracking-normal text-[#f8f3ea] sm:text-5xl md:text-6xl">
              Think clearly,
              <br />
              build faster
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#f8f3ea]/78 sm:mt-5 sm:text-base">
              Brainstorm in chat, generate images, and ship ideas from one workspace.
            </p>

            <form
              id="signin"
              className="mt-6 rounded-xl border border-white/10 bg-[#171714] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.5)] sm:mt-8 sm:rounded-2xl sm:p-5"
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

              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-white/15 bg-white px-4 text-sm font-semibold text-[#161512] transition hover:bg-[#f6f1e8] disabled:cursor-not-allowed disabled:opacity-70"
                onClick={fallbackGoogleLogin}
                disabled={!googleEnabled && googleStatus === "Checking Google Sign-In..."}
              >
                <GoogleMark />
                {googleEnabled ? "Continue with Google" : googleStatus}
              </button>

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
              {notice && (
                <p className="mt-3 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70">
                  {notice}
                  {resetUrl && (
                    <a className="mt-2 block break-all font-semibold text-[#f6f1e8] underline" href={resetUrl}>
                      Open reset link
                    </a>
                  )}
                </p>
              )}

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

          <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/15 bg-black p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.62)] sm:max-w-[640px] sm:p-6 lg:mr-0">
            <div className="rounded-xl bg-[#f4f0ea] p-4 text-[#15130f] sm:rounded-[28px] sm:p-8 md:p-10">
              <div className="mb-5 flex items-center justify-between sm:mb-7">
                <h2 className="font-serif text-3xl sm:text-4xl">Theo</h2>
                <span className="rounded-full bg-[#15130f] px-2.5 py-1 text-[10px] font-semibold text-[#f4f0ea] sm:px-3 sm:text-xs">Live workspace</span>
              </div>

              <div className="mb-5 flex items-center gap-3 sm:mb-8 sm:gap-4">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#15130f] text-[#f4f0ea] sm:h-9 sm:w-9">
                  <Plus size={18} />
                </div>
                <span className="text-base font-medium sm:text-xl">New task</span>
              </div>

              <div className="space-y-3.5 text-sm sm:space-y-6 sm:text-xl">
                <PreviewRow icon={MessageSquare} text="Draft launch plan for AI image gallery" active />
                <PreviewRow icon={Code2} text="Explain refresh token rotation" active />
                <PreviewRow icon={Image} text="Generate cinematic app hero image" active />
                <PreviewRow icon={Bot} text="Analyze subscription usage limits" loading />
                <PreviewRow icon={Zap} text="Refine image queue flow" active />
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-5 pb-18 sm:pb-24 lg:pb-28">
          <div className="text-center">
            <h2 className="font-serif text-3xl">Explore plans</h2>
            <div className="mt-6 inline-flex rounded-md bg-white/8 p-1">
              <button className="rounded bg-[#2b2925] px-5 py-2 text-sm font-semibold text-white">Individual</button>
              <button className="px-5 py-2 text-sm font-semibold text-white/50">Team</button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-xl border bg-[#1f1d1a] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:rounded-2xl sm:p-7 sm:shadow-[0_24px_70px_rgba(0,0,0,0.28)] ${
                  plan.featured ? "border-[#547b96]" : "border-white/12"
                }`}
              >
                <div className="mb-6 text-[#f6f1e8]/80 sm:mb-10">
                  <PlanMark />
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl">{plan.name}</h3>
                <p className="mt-1 text-sm text-white/70">{plan.subtitle}</p>
                <p className="mt-5 text-2xl font-semibold sm:mt-7">{plan.price}</p>
                <p className="mt-1 text-xs text-white/45">Per month while active</p>
                <a href="#signin" className="mt-7 flex h-11 items-center justify-center rounded-md bg-[#f6f1e8] text-sm font-semibold text-[#161512]">
                  Try Theo
                </a>
                <div className="my-6 h-px bg-white/10 sm:my-8" />
                <ul className="space-y-3 text-sm text-white/74 sm:space-y-4">
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

        <section id="faq" className="mx-auto max-w-2xl px-5 pb-16 sm:pb-28">
          <h2 className="text-center font-serif text-3xl">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-white/10">
            {faqItems.map((item, index) => (
              <div key={item.question}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-6 py-4 text-left font-serif text-xl text-[#f6f1e8]/82"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  {item.question}
                  <Plus className={`shrink-0 transition ${openFaq === index ? "rotate-45" : ""}`} size={18} />
                </button>
                {openFaq === index && (
                  <p className="pb-5 text-sm leading-6 text-[#f6f1e8]/55">{item.answer}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black px-5 py-10 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.2fr_3fr]">
          <div className="flex flex-col justify-between lg:min-h-72">
            <a href="#top" className="flex items-center gap-2 text-xl font-semibold">
              <img src="/favicon.svg" alt="" className="h-7 w-7" />
              Theo
            </a>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="mb-4 text-sm font-semibold text-white/70">{column.title}</h3>
                <ul className="space-y-3 text-sm text-white/45">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="hover:text-white">
                        {link.label}
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
    <div className="flex items-center justify-between gap-3 sm:gap-5">
      <div className={`flex min-w-0 items-center gap-3 sm:gap-4 ${loading ? "text-[#15130f]" : "text-[#15130f]/58"}`}>
        <Icon className="shrink-0" size={18} />
        <span className="min-w-0 leading-snug">{text}</span>
      </div>
      {loading ? <Circle className="shrink-0 animate-spin text-[#bdb8ae]" size={24} /> : <span className={`h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3 ${active ? "bg-[#2d83d4]" : "bg-[#c8c2b8]"}`} />}
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
