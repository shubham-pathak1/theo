import { Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  if (!className) {
    return <code className="rounded bg-ink/10 px-1 py-0.5 dark:bg-white/10">{children}</code>;
  }

  return (
    <div className="relative">
      <button
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md bg-white/90 text-ink shadow-sm"
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
      className="prose prose-sm max-w-none dark:prose-invert prose-pre:overflow-x-auto prose-pre:rounded-md prose-pre:bg-[#171719]"
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
