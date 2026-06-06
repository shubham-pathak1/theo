import { CreditCard, Edit3, Image as ImageIcon, LogOut, MessageSquare, PanelLeft, Pin, PinOff, Plus, RotateCcw, Search, Send, Settings, Square, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { MarkdownMessage } from "../components/MarkdownMessage.jsx";
import { api, streamMessage } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const promptPresets = [
  { label: "Plan", prompt: "Help me turn this idea into a clear implementation plan:" },
  { label: "Debug", prompt: "Help me debug this issue step by step:" },
  { label: "Write", prompt: "Rewrite this clearly and professionally:" },
  { label: "Code", prompt: "Review this code and suggest the cleanest fix:" }
];

const navItems = [
  { to: "/", label: "Chat", icon: MessageSquare },
  { to: "/images", label: "Images", icon: ImageIcon },
  { to: "/gallery", label: "Gallery", icon: Users },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function ChatPage() {
  const { user, logout } = useAuth();
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
  const loadConversations = useCallback(async () => {
    const data = await api.get("/api/chat/conversations");
    setConversations(data.conversations || []);
  }, []);

  useEffect(() => {
    loadConversations();
    api.get("/api/chat/models").then((data) => setModels(data.models || [])).catch(() => null);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    api.get(`/api/chat/conversations/${activeId}`).then(({ conversation }) => {
      setMessages(conversation.messages || []);
    });
  }, [activeId]);

  function newChat() {
    setActiveId("");
    setMessages([]);
    setDraft("");
    setError("");
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
    <div className="rounded-3xl border border-white/10 bg-[#282723] p-3 shadow-[0_22px_80px_rgba(0,0,0,0.22)] sm:p-4">
      <textarea
        className="min-h-20 w-full resize-none bg-transparent text-base leading-7 text-[#f4f1ea] outline-none placeholder:text-[#9a948b] sm:min-h-24"
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
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <button className="grid h-10 w-10 place-items-center rounded-full text-[#f4f1ea] transition hover:bg-white/7" type="button" onClick={() => setDraft((value) => value || "Help me with ")}>
          <Plus size={20} />
        </button>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <select
            className="h-10 min-w-0 rounded-xl border border-white/10 bg-[#1d1c1a] px-3 text-sm font-medium text-[#f4f1ea] outline-none"
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
    <div className="grid min-h-screen bg-[#1d1c1a] text-[#f4f1ea] lg:grid-cols-[16rem_minmax(0,1fr)]">
      {railOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/55 backdrop-blur-sm lg:hidden"
          onClick={() => setRailOpen(false)}
          aria-label="Close conversations"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[min(84vw,16rem)] flex-col border-r border-white/10 bg-[#181715] transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:translate-x-0 ${
          railOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <div>
              <p className="font-serif text-2xl font-semibold">Theo</p>
              <p className="text-xs text-[#aaa49a]">{user?.plan || "free"} plan</p>
            </div>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-full text-[#aaa49a] transition hover:bg-white/7 hover:text-[#f4f1ea]" title="Search">
            <Search size={18} />
          </button>
        </div>

        <div className="px-3">
          <button className="flex h-11 w-full items-center gap-3 rounded-xl px-2 text-left text-sm font-semibold text-[#f4f1ea] transition hover:bg-white/7" onClick={newChat}>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#2b2a27]">
              <Plus size={17} />
            </span>
            New chat
          </button>

          <nav className="mt-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                    isActive ? "bg-[#11110f] text-[#fffaf0]" : "text-[#c9c3ba] hover:bg-white/7 hover:text-[#fffaf0]"
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-5 border-t border-white/10 px-4 pt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[#8f887f]" size={15} />
            <input
              className="h-9 w-full bg-transparent pl-7 pr-2 text-sm text-[#f4f1ea] outline-none placeholder:text-[#8f887f]"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chats"
            />
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="mb-2 flex items-center justify-between text-xs text-[#8f887f]">
            <span>Recents</span>
            <span>{filteredConversations.length}</span>
          </div>
          <div className="space-y-1">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`group flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition ${
                  activeId === conversation.id ? "bg-[#2b2a27] text-[#fffaf0]" : "text-[#c9c3ba] hover:bg-white/7 hover:text-[#fffaf0]"
                }`}
                onClick={() => selectConversation(conversation.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{conversation.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-[#8f887f]">{conversation.preview}</span>
                </span>
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[#aaa49a] opacity-0 transition hover:bg-white/10 group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePinned(conversation);
                  }}
                  title={conversation.pinned ? "Unpin" : "Pin"}
                >
                  {conversation.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                </span>
              </button>
            ))}
            {filteredConversations.length === 0 && <p className="px-2 py-3 text-sm text-[#8f887f]">No chats yet.</p>}
          </div>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#d8d1c7] text-sm font-semibold text-[#181715]">
                {(user?.displayName || user?.email || "T").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.displayName}</p>
              <p className="truncate text-xs text-[#aaa49a]">{user?.email}</p>
            </div>
          </div>
          <button className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#22211f] text-sm font-semibold transition hover:bg-[#2b2a27]" onClick={logout}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="grid min-h-screen min-w-0 grid-rows-[auto_1fr_auto]">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#1d1c1a]/90 px-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button className="icon-btn rounded-full lg:hidden" onClick={() => setRailOpen((value) => !value)} title="Chats">
              <PanelLeft size={18} />
            </button>
            {activeConversation && (
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold">{activeConversation.title}</h1>
                <p className="truncate text-sm text-[#aaa49a]">{activeModel?.description || "Balanced reasoning for everyday work."}</p>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="icon-btn rounded-full" onClick={renameConversation} disabled={!activeConversation} title="Rename">
              <Edit3 size={17} />
            </button>
            <button className="icon-btn rounded-full" onClick={deleteConversation} disabled={!activeId} title="Delete">
              <Trash2 size={17} />
            </button>
          </div>
        </header>

        <section className="overflow-y-auto px-3 py-5 sm:px-5 sm:py-6">
          <div className="mx-auto max-w-4xl space-y-5">
            {messages.length === 0 && (
              <div className="grid min-h-[calc(100vh-13rem)] place-items-center">
                <div className="w-full max-w-3xl">
                  <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-[#2b2a27]">
                      <img src="/favicon.svg" alt="" className="h-7 w-7" />
                    </div>
                    <p className="font-serif text-3xl text-[#e8dfd2] sm:text-5xl">Hey there, {user?.displayName?.split(" ")[0] || "there"}</p>
                    <p className="mt-3 text-[#aaa49a]">Ask, draft, debug, or shape a visual idea.</p>
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
                <div className={message.role === "user" ? "max-w-[88%] rounded-3xl bg-[#34322f] px-4 py-3 text-[#fffaf0] sm:max-w-[76%]" : "max-w-full px-1 py-2 text-[#f4f1ea] sm:max-w-[86%]"}>
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
