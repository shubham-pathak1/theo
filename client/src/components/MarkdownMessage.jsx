import { Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  if (!className) {
    return <code className="rounded-md bg-[#2b2a27] px-1.5 py-0.5 text-[0.92em] text-[#f4f1ea]">{children}</code>;
  }

  return (
    <div className="relative">
      <button
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-[#f4f1ea] text-[#171614] shadow-sm"
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1300);
        }}
        title="Copy code"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <code className={className}>{children}</code>
    </div>
  );
}

export function MarkdownMessage({ content }) {
  return (
    <ReactMarkdown
      className="theo-markdown"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code: CodeBlock
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
