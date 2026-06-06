import { Edit3, Layers3, PanelLeft, Pin, PinOff, Plus, RotateCcw, Search, Send, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownMessage } from "../components/MarkdownMessage.jsx";
import { api, streamMessage } from "../lib/api.js";

const promptPresets = [
  { label: "Plan", prompt: "Help me turn this idea into a clear implementation plan:" },
  { label: "Debug", prompt: "Help me debug this issue step by step:" },
  { label: "Write", prompt: "Rewrite this clearly and professionally:" },
  { label: "Code", prompt: "Review this code and suggest the cleanest fix:" }
];

export function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("medium");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [railOpen, setRailOpen] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState("");
  const [memoryMeta, setMemoryMeta] = useState({ compactedUntil: 0, contextSummary: "" });
  const abortRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId),
    [activeId, conversations]
  );
  const activeModel = models.find((model) => model.id === selectedModel);
  const filteredConversations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((item) => `${item.title} ${item.preview}`.toLowerCase().includes(needle));
  }, [conversations, query]);
  const contextPercent = Math.min(100, Math.round((messages.filter((message) => message.content?.trim()).length / 18) * 100));
  const compactedTurns = Math.max(memoryMeta.compactedUntil || 0, activeConversation?.compactedUntil || 0);

  const loadConversations = useCallback(async () => {
    const data = await api.get("/api/chat/conversations");
    setConversations(data.conversations || []);
    if (!activeId && data.conversations?.[0]) {
      setActiveId(data.conversations[0].id);
    }
  }, [activeId]);

  useEffect(() => {
    loadConversations();
    api.get("/api/chat/models").then((data) => setModels(data.models || [])).catch(() => null);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setMemoryMeta({ compactedUntil: 0, contextSummary: "" });
      return;
    }

    api.get(`/api/chat/conversations/${activeId}`).then(({ conversation }) => {
      setMessages(conversation.messages || []);
      setMemoryMeta({
        compactedUntil: conversation.compactedUntil || 0,
        contextSummary: conversation.contextSummary || ""
      });
    });
  }, [activeId]);

  async function newChat() {
    const { conversation } = await api.post("/api/chat/conversations", {});
    setConversations((items) => [{ id: conversation._id, title: conversation.title, preview: "", pinned: false }, ...items]);
    setActiveId(conversation._id);
    setMessages([]);
    setDraft("");
    setError("");
    setMemoryMeta({ compactedUntil: 0, contextSummary: "" });
    setRailOpen(false);
  }

  function selectConversation(id) {
    setActiveId(id);
    if (window.innerWidth < 1024) setRailOpen(false);
  }

  async function send(overridePrompt) {
    const content = (overridePrompt ?? draft).trim();
    if (!content || busy) return;

    let conversationId = activeId;
    setError("");
    setLastFailedPrompt("");
    setDraft("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (!conversationId) {
        const { conversation } = await api.post("/api/chat/conversations", {});
        conversationId = conversation._id;
        setActiveId(conversationId);
      }

      setMessages((items) => [...items, { role: "user", content }, { role: "model", content: "" }]);

      await streamMessage(
        conversationId,
        { message: content, model: selectedModel },
        (token) => {
          setMessages((items) => {
            const copy = [...items];
            copy[copy.length - 1] = {
              ...copy[copy.length - 1],
              content: copy[copy.length - 1].content + token
            };
            return copy;
          });
        },
        { signal: controller.signal }
      );

      await loadConversations();
      const { conversation } = await api.get(`/api/chat/conversations/${conversationId}`);
      setMemoryMeta({
        compactedUntil: conversation.compactedUntil || 0,
        contextSummary: conversation.contextSummary || ""
      });
    } catch (err) {
      const stopped = err.name === "AbortError";
      setError(stopped ? "Generation stopped." : err.message);
      if (!stopped) setLastFailedPrompt(content);
      setMessages((items) => items.filter((message) => message.content?.trim()));
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
  }

  async function renameConversation() {
    if (!activeConversation) return;
    const title = window.prompt("Rename conversation", activeConversation.title);
    if (!title) return;

    const { conversation } = await api.patch(`/api/chat/conversations/${activeId}`, { title });
    setConversations((items) => items.map((item) => (item.id === activeId ? { ...item, title: conversation.title } : item)));
  }

  async function togglePinned(conversation) {
    const { conversation: updated } = await api.patch(`/api/chat/conversations/${conversation.id}`, { pinned: !conversation.pinned });
    setConversations((items) =>
      items
        .map((item) => (item.id === conversation.id ? { ...item, pinned: updated.pinned } : item))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    );
  }

  async function deleteConversation() {
    if (!activeId) return;
    await api.delete(`/api/chat/conversations/${activeId}`);
    setActiveId("");
    setMessages([]);
    await loadConversations();
  }

  const composer = (
    <div className="border border-white/10 bg-[#24231f] p-3 shadow-[0_22px_80px_rgba(0,0,0,0.22)] sm:p-4">
      <textarea
        className="min-h-20 w-full resize-none bg-transparent text-base leading-7 text-[#f4f1ea] outline-none placeholder:text-[#8f887f] sm:min-h-24"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
        placeholder="Message Theo"
      />
      <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-xs text-[#aaa49a]">
          <Layers3 size={14} />
          <span>Context {contextPercent}%</span>
          {compactedTurns > 0 && <span className="truncate">/ {compactedTurns} earlier turns summarized</span>}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <select
            className="h-10 min-w-0 rounded-lg border border-white/10 bg-[#1d1c1a] px-3 text-sm font-medium text-[#f4f1ea] outline-none"
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
            title="Model tier"
          >
            {(models.length ? models : [{ id: "medium", label: "Theo Medium" }]).map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
          {busy ? (
            <button className="primary-icon-btn" onClick={stopGeneration} title="Stop">
              <Square size={17} />
            </button>
          ) : (
            <button className="primary-icon-btn" onClick={() => send()} disabled={!draft.trim()} title="Send">
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen bg-[#1d1c1a] pb-20 text-[#f4f1ea] lg:grid-cols-[20rem_minmax(0,1fr)] lg:pb-0">
      {railOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/55 backdrop-blur-sm lg:hidden"
          onClick={() => setRailOpen(false)}
          aria-label="Close conversations"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[min(88vw,20rem)] overflow-y-auto border-r border-white/10 bg-[#181715] p-4 transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:translate-x-0 ${
          railOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f887f]" size={16} />
            <input
              className="h-11 w-full border border-white/10 bg-[#22211f] pl-9 pr-3 text-sm text-[#f4f1ea] outline-none placeholder:text-[#8f887f] focus:border-white/30"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chats"
            />
          </div>
          <button className="icon-btn" onClick={newChat} title="New chat">
            <Plus size={17} />
          </button>
        </div>

        <div className="space-y-2">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`group flex w-full items-start gap-3 border p-3 text-left transition ${
                activeId === conversation.id
                  ? "border-white/20 bg-[#2b2a27]"
                  : "border-white/8 bg-[#1d1c1a] hover:border-white/16 hover:bg-[#24231f]"
              }`}
              onClick={() => selectConversation(conversation.id)}
            >
              <span className="mt-1 text-[#aaa49a]">{conversation.pinned ? <Pin size={14} /> : <PanelLeft size={14} />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#f4f1ea]">{conversation.title}</span>
                <span className="mt-1 block truncate text-xs text-[#8f887f]">{conversation.preview || "No messages yet"}</span>
              </span>
              <span
                className="grid h-7 w-7 shrink-0 place-items-center border border-white/10 bg-[#22211f] text-[#aaa49a] opacity-0 transition group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  togglePinned(conversation);
                }}
                title={conversation.pinned ? "Unpin" : "Pin"}
              >
                {conversation.pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </span>
            </button>
          ))}
          {filteredConversations.length === 0 && <p className="border border-dashed border-white/10 p-4 text-sm text-[#8f887f]">No chats found.</p>}
        </div>
      </aside>

      <main className="grid min-h-screen min-w-0 grid-rows-[auto_1fr_auto]">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#1d1c1a]/90 px-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button className="icon-btn lg:hidden" onClick={() => setRailOpen((value) => !value)} title="Chats">
              <PanelLeft size={18} />
            </button>
            <button className="hidden h-9 w-9 place-items-center border border-white/10 bg-[#2b2a27] text-[#f4f1ea] transition hover:bg-[#34322f] lg:grid" onClick={newChat} title="New chat">
              <Plus size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">{activeConversation?.title || "New chat"}</h1>
              <p className="truncate text-sm text-[#aaa49a]">{activeModel?.description || "Balanced reasoning for everyday work."}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="icon-btn" onClick={renameConversation} disabled={!activeConversation} title="Rename">
              <Edit3 size={17} />
            </button>
            <button className="icon-btn" onClick={deleteConversation} disabled={!activeId} title="Delete">
              <Trash2 size={17} />
            </button>
          </div>
        </header>

        <section className="overflow-y-auto px-3 py-5 sm:px-5 sm:py-6">
          <div className="mx-auto max-w-4xl space-y-5">
            {messages.length === 0 && (
              <div className="grid min-h-[calc(100vh-13rem)] place-items-center">
                <div className="w-full">
                  <div className="mb-8 text-center">
                    <p className="font-serif text-3xl text-[#e8dfd2] sm:text-5xl">What are we making?</p>
                    <p className="mt-3 text-[#aaa49a]">Start with a thought, bug, plan, or rough draft.</p>
                  </div>
                  {composer}
                  <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
                    {promptPresets.map((item) => (
                      <button key={item.label} className="icon-btn" onClick={() => setDraft(item.prompt)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={message.role === "user" ? "max-w-[88%] bg-[#34322f] px-4 py-3 text-[#fffaf0] sm:max-w-[78%]" : "max-w-full px-1 py-2 text-[#f4f1ea] sm:max-w-[92%]"}>
                  {message.role === "model" ? (
                    message.content ? <MarkdownMessage content={message.content} /> : <ThinkingIndicator />
                  ) : (
                    <p className="leading-7">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="flex items-center justify-between gap-3 border border-[#d9895f]/30 bg-[#d9895f]/10 px-3 py-2 text-sm text-[#efb18d]">
                <span>{error}</span>
                {lastFailedPrompt && (
                  <button className="inline-flex items-center gap-2 font-semibold text-[#f4f1ea]" onClick={() => send(lastFailedPrompt)}>
                    <RotateCcw size={15} />
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <footer className={`bg-[#1d1c1a] px-3 pb-5 sm:px-5 ${messages.length === 0 ? "hidden" : ""}`}>
          <div className="mx-auto max-w-3xl">{composer}</div>
        </footer>
      </main>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-[#8f887f]">
      <span className="h-2 w-2 animate-pulse bg-[#d9895f]" />
      <span>Thinking</span>
    </div>
  );
}
