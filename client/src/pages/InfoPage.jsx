import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const pages = {
  about: {
    title: "About Theo",
    eyebrow: "Company",
    body: [
      "Theo is a focused workspace for thinking, writing, image prompts, and saved creative work.",
      "The product is designed to feel quiet and direct: fewer surfaces, cleaner history, and a workspace that keeps useful output close."
    ]
  },
  security: {
    title: "Security",
    eyebrow: "Company",
    body: [
      "Theo uses account authentication, protected routes, and session handling to keep workspace access private.",
      "For production deployments, environment secrets, provider keys, and database access should be managed through secure platform configuration."
    ]
  },
  terms: {
    title: "Terms",
    eyebrow: "Legal",
    body: [
      "Use Theo responsibly and do not submit content that you do not have permission to process.",
      "Generated outputs, saved prompts, and published gallery items remain tied to the account that created them."
    ]
  },
  privacy: {
    title: "Privacy",
    eyebrow: "Legal",
    body: [
      "Theo stores account details, workspace history, image requests, and plan usage so the product can function correctly.",
      "Sensitive configuration such as API keys and provider credentials should never be committed to source control."
    ]
  },
  contact: {
    title: "Contact",
    eyebrow: "Company",
    body: [
      "For support, product questions, or collaboration requests, contact the Theo team from the workspace support channel.",
      "Sales and support links are kept simple so the product stays easy to navigate."
    ]
  },
  docs: {
    title: "Docs",
    eyebrow: "Resources",
    body: [
      "Start with Chat for conversations, Images for prompt-based generation, Gallery for published outputs, and Billing for usage plans.",
      "Settings stores profile details and custom instructions used to shape Theo responses."
    ]
  },
  status: {
    title: "Status",
    eyebrow: "Resources",
    body: [
      "Theo depends on the application server, database, AI providers, and image storage.",
      "If a provider is unavailable, the workspace keeps the request visible and shows a clear status instead of hiding the failure."
    ]
  },
  examples: {
    title: "Examples",
    eyebrow: "Resources",
    body: [
      "Draft a product brief, explain a code path, generate image directions, summarize a plan, or keep multiple ideas inside one workspace.",
      "Theo works best when prompts include a goal, constraints, and the kind of output you want."
    ]
  },
  changelog: {
    title: "Changelog",
    eyebrow: "Resources",
    body: [
      "Recent updates include cleaner landing navigation, a simplified gallery, Cloudflare image provider support, and improved workspace styling.",
      "Future updates will focus on stronger image generation flow, richer settings, and cleaner mobile behavior."
    ]
  },
  support: {
    title: "Support",
    eyebrow: "Resources",
    body: [
      "If something fails, check the selected model, provider status, and environment configuration first.",
      "For account or workspace issues, use the contact route or support channel from the app."
    ]
  }
};

export function InfoPage({ page }) {
  const content = pages[page] || pages.about;

  return (
    <main className="min-h-screen bg-[#11110f] px-5 py-6 text-[#f6f1e8]">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <Link to="/auth" className="flex items-center gap-2 text-lg font-semibold">
            <img src="/favicon.svg" alt="" className="h-6 w-6" />
            Theo
          </Link>
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft size={16} />
            Back
          </Link>
        </header>

        <section className="py-24">
          <p className="mb-5 text-xs uppercase tracking-[0.2em] text-white/35">{content.eyebrow}</p>
          <h1 className="font-serif text-5xl leading-tight text-[#f8f3ea]">{content.title}</h1>
          <div className="mt-8 space-y-5 text-lg leading-8 text-white/62">
            {content.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
