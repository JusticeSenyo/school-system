import React, { useEffect, useMemo, useRef, useState } from "react";

/** Inject minimal CSS once */
const STYLE_TAG_ID = "supportchat-styles";
function injectStyles() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const css = `
  .sc-card { width: 300px; border-radius: 12px; box-shadow: 0 10px 28px rgba(0,0,0,.12); overflow: hidden; border: 1px solid var(--sc-bd); background: var(--sc-bg); color: var(--sc-fg); font-size:12.5px; }
  .sc-header { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; font-weight:700; background: var(--sc-header-bg); color: var(--sc-header-fg); }
  .sc-body { height: 200px; overflow-y:auto; padding:8px; background: var(--sc-bg); }
  .sc-quick { display:flex; flex-wrap:wrap; gap:6px; padding:6px 8px; border-top: 1px solid var(--sc-bd); border-bottom: 1px solid var(--sc-bd);}
  .sc-chip { font-size:11px; padding:3px 8px; border-radius:999px; border:1px solid var(--sc-bd-2); background: var(--sc-chip-bg); cursor:pointer; }
  .sc-footer { display:flex; gap:6px; padding:8px; border-top: 1px solid var(--sc-bd); align-items:flex-start; }
  .sc-input { flex:1; padding:6px 8px; border-radius:10px; border:1px solid var(--sc-bd-2); background: var(--sc-input-bg); color: var(--sc-fg); font-size:12.5px; }
  .sc-btn { padding:7px 10px; border-radius:10px; background:#2563eb; color:white; font-weight:700; border:none; cursor:pointer; font-size:12.5px; }
  .sc-btn:disabled { opacity:.6; cursor:default; }
  .sc-mini { display:grid; grid-template-columns:1fr; gap:6px; padding:6px 8px; border-top:1px solid var(--sc-bd); }
  .sc-mini-row { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .sc-field { padding:6px 8px; border-radius:10px; border:1px solid var(--sc-bd-2); background: var(--sc-input-bg); color: var(--sc-fg); font-size:12.5px; }
  .sc-bubble { display:inline-block; padding:7px 9px; border-radius:12px; font-size:12.5px; max-width: 90%; background: var(--sc-bubble-bot-bg); color: var(--sc-fg); line-height:1.35; }
  .sc-bubble.user { background:#2563eb; color:#fff; }
  .sc-open { position:fixed; right:16px; bottom:16px; border-radius:999px; padding:9px 12px; background:#2563eb; color:white; font-weight:700; border:none; box-shadow:0 10px 30px rgba(0,0,0,.2); cursor:pointer; font-size:12.5px; }
  .sc-wrap { position:fixed; right:16px; bottom:16px; z-index:9999; }
  .sc-close { color:inherit; background:transparent; border:none; font-size:16px; cursor:pointer; padding:2px 4px; }
  .sc-list { display:flex; flex-direction:column; gap:6px; }
  .sc-row { text-align:left; }
  .sc-row.user { text-align:right; }

  /* Light theme variables */
  :root {
    --sc-bg:#ffffff; --sc-fg:#0f172a; --sc-bd:#e5e7eb; --sc-bd-2:#d1d5db;
    --sc-header-bg:#0f172a; --sc-header-fg:#fff;
    --sc-chip-bg:#f8fafc; --sc-input-bg:#ffffff; --sc-bubble-bot-bg:#f3f4f6;
  }
  /* Dark theme variables */
  .sc-dark, @media (prefers-color-scheme: dark) {
    --sc-bg:#0b0b0c; --sc-fg:#e5e7eb; --sc-bd:#1f2937; --sc-bd-2:#374151;
    --sc-header-bg:#000; --sc-header-fg:#fff;
    --sc-chip-bg:#141416; --sc-input-bg:#0f1113; --sc-bubble-bot-bg:#141416;
  }
  @media (max-width: 640px) {
    .sc-card { width: 92vw; }
    .sc-body { height: 34vh; } /* still small on phones */
  }`;
  const tag = document.createElement("style");
  tag.id = STYLE_TAG_ID;
  tag.textContent = css;
  document.head.appendChild(tag);
}

/** System/light/dark theme hook: adds/removes `.sc-dark` on html */
function useTheme(theme = "system") {
  useEffect(() => {
    injectStyles();
    const root = document.documentElement;
    const apply = (mode) => {
      if (mode === "dark") root.classList.add("sc-dark");
      else root.classList.remove("sc-dark");
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
  supportEmail = process.env.REACT_APP_SUPPORT_EMAIL || "support@schoolmasterhub.net",
  faqs = DEFAULT_FAQ,
  theme = "system", // "light" | "dark" | "system"
  openByDefault = false,
  publicToken, // optional tiny guard header
  autoCloseOnEscalate = true,
  autoCloseDelayMs = 1200,
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

  const transcript = useMemo(
    () => messages.map(m => `${m.role === "user" ? "User" : "Bot"}: ${m.text}`).join("\n"),
    [messages]
  );

  function onKeyDownInput(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  }

  function onSend() {
    // If we already decided this needs human, then this Send should escalate
    if (needsHuman) {
      // do escalate (validates email)
      void escalate();
      return;
    }
    // Otherwise, send a chat message and decide if FAQ or escalate next
    sendMessage();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setMessages(m => [...m, { role: "user", text }]);
    setInput("");

    const hit = matchFaq(faqs, text);
    if (hit) {
      setMessages(m => [...m, { role: "bot", text: hit.a }]);
      return;
    }
    // No hit -> flip into "needsHuman" mode and show tiny fields; same Send button will submit
    setNeedsHuman(true);
    setMessages(m => [
      ...m,
      { role: "bot", text: "I couldn’t find a perfect answer. Enter your details below and press Send to create a ticket. I’ll include our transcript." }
    ]);
  }

  async function escalate(e) {
    if (e) e.preventDefault();
    const name = nameRef.current?.value?.trim();
    const email = emailRef.current?.value?.trim();
    const subject = subjectRef.current?.value?.trim() || "Support Request";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email.");
      emailRef.current?.focus();
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
      setMessages(m => [...m, { role: "bot", text: "✅ Sent! A human will reach out by email." }]);
      setNeedsHuman(false);
      if (autoCloseOnEscalate) setTimeout(() => setOpen(false), autoCloseDelayMs);
    } catch (err) {
      setMessages(m => [...m, { role: "bot", text: `⚠️ Couldn’t send: ${err.message || err}` }]);
    } finally {
      setSending(false);
    }
  }

  function Bubble({ role, children }) {
    const isUser = role === "user";
    return (
      <div className={`sc-row ${isUser ? "user" : ""}`}>
        <div className={`sc-bubble ${isUser ? "user" : ""}`}>{children}</div>
      </div>
    );
  }

  return (
    <div className="sc-wrap">
      {!open && (
        <button className="sc-open" onClick={() => setOpen(true)} aria-label="Open SupportChat">
          SupportChat
        </button>
      )}

      {open && (
        <div className="sc-card" role="dialog" aria-label={`${productName} SupportChat`}>
          <div className="sc-header">
            <span>{productName} SupportChat</span>
            <button className="sc-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>

          <div className="sc-quick">
            {faqs.map((f) => (
              <button
                key={f.q}
                className="sc-chip"
                title="Click to prefill the input"
                onClick={() => setInput(f.q)}
              >
                {f.q}
              </button>
            ))}
          </div>

          <div className="sc-body">
            <div className="sc-list">
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role}>{m.text}</Bubble>
              ))}
            </div>
          </div>

          {/* Tiny inline contact fields only when needed; no extra button */}
          {needsHuman && (
            <div className="sc-mini">
              <input ref={nameRef} className="sc-field" type="text" placeholder="Name" />
              <input ref={emailRef} className="sc-field" type="email" required placeholder="Email" />
              <input ref={subjectRef} className="sc-field" type="text" placeholder="Subject" />
            </div>
          )}

          {/* Single composer: Send handles chat or escalate */}
          <div className="sc-footer">
            <input
              className="sc-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={needsHuman ? "Add any final details…" : "Type your question…"}
              onKeyDown={onKeyDownInput}
            />
            <button className="sc-btn" onClick={onSend} disabled={sending || (!input.trim() && !needsHuman)}>
              {needsHuman ? (sending ? "Sending…" : "Send") : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
