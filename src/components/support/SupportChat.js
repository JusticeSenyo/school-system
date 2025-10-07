import React, { useEffect, useMemo, useRef, useState } from "react";

// Sync <html> theme class: "dark" | "light" | "system"
function useTheme(theme = "system") {
  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode) => {
      if (mode === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    };
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches ? "dark" : "light");
      const onChange = (e) => apply(e.matches ? "dark" : "light");
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    } else {
      apply(theme);
    }
  }, [theme]);
}

const DEFAULT_FAQ = [
  { q: "How do I reset my password?", a: "Go to Settings → Security → Reset Password. We'll email you a link." },
  { q: "How do I add a new school?", a: "Owner/Admin → Schools → Add School, fill details, then Save." },
  { q: "How do I add teachers or students?", a: "Use Manage Staff / Manage Students. Bulk-import with CSV." },
  { q: "How do I subscribe or upgrade?", a: "Billing → Choose plan → Pay with MoMo, Card, or Paystack." },
];

function matchFaq(faqs, text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return null;
  let best = null, bestScore = 0;
  for (const item of faqs) {
    const q = item.q.toLowerCase();
    const words = t.split(/\s+/);
    const score = (q.includes(t) ? 3 : 0) + words.reduce((s, w) => s + (q.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { best = item; bestScore = score; }
  }
  return bestScore >= 2 ? best : null;
}

export default function SupportChat({
  productName = "School Master Hub",
  supportEmail = "support@schoolmasterhub.net",
  faqs = DEFAULT_FAQ,
  publicToken,
  openByDefault = false,
  theme = "system",              // "light" | "dark" | "system"
  autoCloseOnEscalate = true,    // close after successful escalate
  autoCloseDelayMs = 1200,       // delay before closing
}) {
  useTheme(theme);

  const [open, setOpen] = useState(openByDefault);
  const [messages, setMessages] = useState([
    { role: "bot", text: `Hi! I’m ${productName} SupportChat. Ask me anything or tap a quick topic.` },
  ]);
  const [input, setInput] = useState("");
  const [needsHuman, setNeedsHuman] = useState(false);
  const [sending, setSending] = useState(false);

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const subjectRef = useRef(null);
  const taRef = useRef(null);
  const cardRef = useRef(null);
  const bodyRef = useRef(null);

  // Close on ESC + Click outside
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onDocClick = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, open]);

  const transcript = useMemo(
    () => messages.map(m => `${m.role === "user" ? "User" : "Bot"}: ${m.text}`).join("\n"),
    [messages]
  );

  function growTextarea(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    growTextarea(taRef.current);

    const hit = matchFaq(faqs, text);
    if (hit) {
      setMessages((m) => [...m, { role: "bot", text: hit.a }]);
      return;
    }

    setNeedsHuman(true);
    setMessages((m) => [
      ...m,
      { role: "bot", text: "I couldn’t find a perfect answer. Share your name & email to escalate to a human. I’ll include our transcript." }
    ]);
  }

  async function escalate(e) {
    e.preventDefault();
    const name = nameRef.current?.value?.trim();
    const email = emailRef.current?.value?.trim();
    const subject = subjectRef.current?.value?.trim() || "Support Request";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email.");
      return;
    }

    setSending(true);
    try {
      const resp = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(publicToken ? { "x-smh-token": publicToken } : {}),
        },
        body: JSON.stringify({
          to: [supportEmail],
          subject: `[${productName}] ${subject}`,
          fromName: name || "Guest",
          message:
`New support ticket from ${name || "Guest"} <${email}>

Summary: ${subject}

— Conversation Transcript —
${transcript}

— Contact —
Name: ${name || "Guest"}
Email: ${email}
`,
        }),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.success) throw new Error(json?.error || "Send failed");

      setMessages((m) => [...m, { role: "bot", text: "✅ Sent! A human will reach out by email." }]);
      setNeedsHuman(false);

      if (autoCloseOnEscalate) {
        setTimeout(() => setOpen(false), autoCloseDelayMs);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: `⚠️ Couldn’t send: ${err.message || err}` }]);
    } finally {
      setSending(false);
    }
  }

  function Bubble({ role, children }) {
    const isUser = role === "user";
    return (
      <div className={isUser ? "text-right" : "text-left"}>
        <div
          className={[
            "inline-block px-3 py-2 rounded-2xl text-[13px] leading-snug",
            isUser
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-900 dark:bg-neutral-800 dark:text-gray-100",
          ].join(" ")}
          role={!isUser ? "note" : undefined}
          aria-live={!isUser ? "polite" : undefined}
        >
          {children}
        </div>
      </div>
    );
  }

  function onTextareaKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            setTimeout(() => taRef.current?.focus(), 150);
          }}
          className="rounded-full shadow-xl px-4 py-2.5 text-[13px] font-semibold
                     bg-blue-600 text-white hover:bg-blue-700
                     focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          aria-label="Open SupportChat"
        >
          SupportChat
        </button>
      )}

      {open && (
        <div
          ref={cardRef}
          className="w-[320px] sm:w-80 rounded-2xl shadow-xl border overflow-hidden
                     bg-white text-gray-900 border-gray-200
                     dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-800"
          role="dialog"
          aria-label={`${productName} SupportChat`}
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-4 py-2.5 text-[13px] font-semibold flex items-center justify-between
                          bg-gray-900 text-white dark:bg-black">
            <span>{productName} SupportChat</span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 rounded px-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Quick chips */}
          <div className="p-2.5 flex flex-wrap gap-2 border-b border-gray-200 dark:border-neutral-800">
            {faqs.map((f) => (
              <button
                key={f.q}
                onClick={() => {
                  setInput(f.q);
                  setTimeout(() => {
                    if (taRef.current) {
                      growTextarea(taRef.current);
                      taRef.current.focus();
                    }
                  }, 0);
                }}
                className="text-[11px] px-2.5 py-1 rounded-full border
                           border-gray-300 hover:bg-gray-50
                           dark:border-neutral-700 dark:hover:bg-neutral-800"
                title="Click to prefill the input"
              >
                {f.q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            ref={bodyRef}
            className="p-3 space-y-2 h-64 sm:h-72 overflow-y-auto bg-white dark:bg-neutral-900"
          >
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.text}
              </Bubble>
            ))}
          </div>

          {/* Escalation form */}
          {needsHuman && (
            <form
              onSubmit={escalate}
              className="px-3 pb-2 space-y-2 border-t border-gray-200 dark:border-neutral-800"
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  ref={nameRef}
                  type="text"
                  placeholder="Your name"
                  className="border rounded-xl px-3 py-2 text-[13px]
                             bg-white text-gray-900 placeholder-gray-400
                             border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40
                             dark:bg-neutral-900 dark:text-gray-100 dark:placeholder-gray-400 dark:border-neutral-700"
                />
                <input
                  ref={emailRef}
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="border rounded-xl px-3 py-2 text-[13px]
                             bg-white text-gray-900 placeholder-gray-400
                             border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40
                             dark:bg-neutral-900 dark:text-gray-100 dark:placeholder-gray-400 dark:border-neutral-700"
                />
              </div>
              <input
                ref={subjectRef}
                type="text"
                placeholder="Short subject"
                className="border rounded-xl px-3 py-2 text-[13px] w-full
                           bg-white text-gray-900 placeholder-gray-400
                           border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40
                           dark:bg-neutral-900 dark:text-gray-100 dark:placeholder-gray-400 dark:border-neutral-700"
              />
              <button
                type="submit"
                disabled={sending}
                className="w-full py-2 rounded-xl text-[13px] font-semibold
                           bg-gray-900 text-white disabled:opacity-60
                           hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-500/40
                           dark:bg-black dark:hover:bg-neutral-950"
              >
                {sending ? "Sending..." : "Escalate to human"}
              </button>
            </form>
          )}

          {/* Composer */}
          <div className="p-2.5 border-t border-gray-200 dark:border-neutral-800">
            <div className="flex items-end gap-2">
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  growTextarea(e.currentTarget);
                }}
                onInput={(e) => growTextarea(e.currentTarget)}
                onKeyDown={onTextareaKeyDown}
                placeholder="Type your question… (Enter to send · Shift+Enter newline)"
                rows={1}
                className="flex-1 border rounded-xl px-3 py-2 text-[13px] leading-snug
                           bg-white text-gray-900 placeholder-gray-400
                           border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40
                           dark:bg-neutral-900 dark:text-gray-100 dark:placeholder-gray-400 dark:border-neutral-700
                           max-h-32 resize-none"
                aria-label="Message input"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="px-3 py-2 rounded-xl text-[13px] font-semibold
                           bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
