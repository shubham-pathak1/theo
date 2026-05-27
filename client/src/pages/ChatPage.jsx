import { Edit3, Layers3, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownMessage } from "../components/MarkdownMessage.jsx";
import { api, streamMessage } from "../lib/api.js";

export function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("medium");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId),
    [activeId, conversations]
  );

  const activeModel = models.find((model) => model.id === selectedModel);
  const contextPercent = Math.min(100, Math.round((messages.length / 18) * 100));

  const loadConversations = useCallback(async () => {
    const data = await api.get("/api/chat/conversations");
    setConversations(data.conversations);
    if (!activeId && data.conversations[0]) {
      setActiveId(data.conversations[0].id);
    }
  }, [activeId]);

  useEffect(() => {
    loadConversations();
    api.get("/api/chat/models").then((data) => setModels(data.models || [])).catch(() => null);
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) {
      api.get(`/api/chat/conversations/${activeId}`).then(({ conversation }) => {
        setMessages(conversation.messages || []);
      });
    }
  }, [activeId]);

  async function newChat() {
    const { conversation } = await api.post("/api/chat/conversations", {});
    setConversations((items) => [{ id: conversation._id, title: conversation.title, preview: "" }, ...items]);
    setActiveId(conversation._id);
    setMessages([]);
  }

  async function send() {
    const content = draft.trim();
    if (!content || busy) return;

    let conversationId = activeId;
    setError("");
    setDraft("");
    setBusy(true);

    try {
      if (!conversationId) {
        const { conversation } = await api.post("/api/chat/conversations", {});
        conversationId = conversation._id;
        setActiveId(conversationId);
      }

      setMessages((items) => [
        ...items,
        { role: "user", content },
        { role: "model", content: "" }
      ]);

      await streamMessage(conversationId, { message: content, model: selectedModel }, (token) => {
        setMessages((items) => {
          const copy = [...items];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            content: copy[copy.length - 1].content + token
          };
          return copy;
        });
      });

      await loadConversations();
    } catch (err) {
      setError(err.message);
      setMessages((items) => items.filter((_, index) => index !== items.length - 1));
    } finally {
      setBusy(false);
    }
  }

  async function renameConversation() {
    if (!activeConversation) return;
    const title = window.prompt("Rename conversation", activeConversation.title);
    if (!title) return;

    const { conversation } = await api.patch(`/api/chat/conversations/${activeId}`, { title });
    setConversations((items) => items.map((item) => (item.id === activeId ? { ...item, title: conversation.title } : item)));
  }

  async function deleteConversation() {
    if (!activeId) return;
    await api.delete(`/api/chat/conversations/${activeId}`);
    setActiveId("");
    setMessages([]);
    await loadConversations();
  }

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-[#f7f5ef] pb-20 text-[#181817] dark:bg-[#111111] dark:text-[#f4f1ea] lg:grid-cols-[320px_1fr] lg:grid-rows-[auto_1fr_auto] lg:pb-0">
      <aside className="hidden border-r border-black/10 bg-[#fbfaf6] p-4 dark:border-white/10 dark:bg-[#171717] lg:row-span-3 lg:block">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">Conversations</h2>
          <button className="icon-btn" onClick={newChat} title="New chat">
            <Plus size={18} />
          </button>
        </div>
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`w-full rounded-md border p-3 text-left transition ${
                activeId === conversation.id
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/10 bg-white hover:border-black/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30"
              }`}
              onClick={() => setActiveId(conversation.id)}
            >
              <p className="truncate text-sm font-semibold">{conversation.title}</p>
              <p className="mt-1 line-clamp-2 text-xs opacity-65">{conversation.preview}</p>
            </button>
          ))}
        </div>
      </aside>

      <header className="flex min-h-16 items-center justify-between border-b border-black/10 bg-[#f7f5ef]/90 px-4 backdrop-blur dark:border-white/10 dark:bg-[#111111]/90">
        <div>
          <h1 className="text-xl font-semibold">{activeConversation?.title || "New chat"}</h1>
          <p className="text-sm text-black/55 dark:text-white/55">Streaming workspace with compacted long-context memory</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="hidden h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-[#1b1b1b] sm:block"
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
          <button className="icon-btn" onClick={newChat} title="New chat">
            <Plus size={18} />
          </button>
          <button className="icon-btn" onClick={renameConversation} title="Rename">
            <Edit3 size={18} />
          </button>
          <button className="icon-btn" onClick={deleteConversation} title="Delete">
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <section className="overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-5">
          {messages.length === 0 && (
            <div className="grid min-h-[45vh] place-items-center text-center">
              <div>
                <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
                  <Sparkles size={20} />
                </div>
                <h2 className="text-4xl font-semibold tracking-tight">Ask Theo anything.</h2>
                <p className="mt-3 text-black/60 dark:text-white/60">Start with a product idea, bug, plan, or code question.</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[86%] rounded-md px-4 py-3 ${
                  message.role === "user"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5"
                }`}
              >
                {message.role === "model" ? <MarkdownMessage content={message.content || "Thinking..."} /> : <p>{message.content}</p>}
              </div>
            </div>
          ))}

          {error && <p className="rounded-md border border-black/20 bg-white px-3 py-2 text-sm text-black dark:border-white/20 dark:bg-white/5 dark:text-white">{error}</p>}
        </div>
      </section>

      <footer className="border-t border-black/10 bg-[#f7f5ef] px-4 py-3 dark:border-white/10 dark:bg-[#111111]">
        <div className="mx-auto mb-2 flex max-w-4xl flex-col justify-between gap-1 text-xs text-black/50 dark:text-white/45 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Layers3 size={14} />
            <span>Context: {contextPercent}% before compaction</span>
          </div>
          <span>{activeModel?.description || "Balanced reasoning for everyday work."}</span>
        </div>
        <div className="mx-auto flex max-w-4xl gap-2">
          <textarea
            className="min-h-12 flex-1 resize-none rounded-md border border-black/10 bg-white px-3 py-3 outline-none transition focus:border-black/40 dark:border-white/10 dark:bg-white/5 dark:focus:border-white/40"
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
          <button className="primary-icon-btn" onClick={send} disabled={busy} title="Send">
            <Send size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
