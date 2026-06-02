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
      setMessages((items) => items.filter((message) => message.content?.trim()));
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

  const composer = (
    <div className="rounded-3xl border border-white/8 bg-[#2b2a27] p-4 shadow-[0_22px_80px_rgba(0,0,0,0.24)]">
      <textarea
        className="min-h-24 w-full resize-none bg-transparent text-lg text-[#f4f1ea] outline-none placeholder:text-[#aaa49a]"
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
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#aaa49a]">
          <Layers3 size={14} />
          <span>Context {contextPercent}%</span>
          <span className="hidden sm:inline">before compaction</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-lg border border-white/8 bg-[#22211f] px-3 text-sm font-medium text-[#f4f1ea] outline-none"
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
          <button className="grid h-10 w-10 place-items-center rounded-xl bg-[#f4f1ea] text-[#171614] transition hover:bg-white" onClick={send} disabled={busy} title="Send">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-[#1d1c1a] pb-20 text-[#f4f1ea] lg:pb-0">
      <header className="flex min-h-16 items-center justify-between border-b border-white/8 bg-[#1d1c1a]/90 px-5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <button className="grid h-9 w-9 place-items-center rounded-full bg-[#2b2a27] text-[#f4f1ea] transition hover:bg-[#34322f]" onClick={newChat} title="New chat">
            <Plus size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{activeConversation?.title || "New chat"}</h1>
            <p className="truncate text-sm text-[#aaa49a]">{activeModel?.description || "Balanced reasoning for everyday work."}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="hidden h-10 max-w-56 rounded-xl border border-white/8 bg-[#24231f] px-3 text-sm text-[#d8d1c7] outline-none xl:block"
            value={activeId}
            onChange={(event) => setActiveId(event.target.value)}
            title="Recent conversations"
          >
            <option value="">New chat</option>
            {conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {conversation.title}
              </option>
            ))}
          </select>
          <button className="grid h-10 w-10 place-items-center rounded-xl bg-[#2b2a27] text-[#d8d1c7] transition hover:bg-[#34322f]" onClick={renameConversation} title="Rename">
            <Edit3 size={17} />
          </button>
          <button className="grid h-10 w-10 place-items-center rounded-xl bg-[#2b2a27] text-[#d8d1c7] transition hover:bg-[#34322f]" onClick={deleteConversation} title="Delete">
            <Trash2 size={17} />
          </button>
        </div>
      </header>

      <section className="overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-4xl space-y-5">
          {messages.length === 0 && (
            <div className="grid min-h-[calc(100vh-8rem)] place-items-center">
              <div className="w-full">
                <div className="mb-12 text-center">
                  <div className="mb-5 inline-flex items-center gap-3">
                    <Sparkles className="text-[#d9895f]" size={34} />
                    <h2 className="font-serif text-5xl tracking-normal text-[#e8dfd2]">Afternoon, Shubham</h2>
                  </div>
                  <p className="text-[#aaa49a]">Think, draft, debug, and generate from one workspace.</p>
                </div>
                {composer}
                <div className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2">
                  {["Write", "Learn", "Code", "Plan", "Theo's choice"].map((item) => (
                    <button key={item} className="rounded-xl bg-[#2b2a27] px-4 py-2 text-sm font-medium text-[#e8dfd2] transition hover:bg-[#34322f]">
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "max-w-[78%] bg-[#34322f] text-[#fffaf0]"
                    : "max-w-[92%] bg-transparent text-[#f4f1ea]"
                }`}
              >
                {message.role === "model" ? <MarkdownMessage content={message.content || "Thinking..."} /> : <p>{message.content}</p>}
              </div>
            </div>
          ))}

          {error && <p className="rounded-xl border border-[#d9895f]/30 bg-[#d9895f]/10 px-3 py-2 text-sm text-[#efb18d]">{error}</p>}
        </div>
      </section>

      <footer className={`bg-[#1d1c1a] px-5 pb-5 ${messages.length === 0 ? "hidden" : ""}`}>
        <div className="mx-auto max-w-3xl">{composer}</div>
      </footer>
    </div>
  );
}
