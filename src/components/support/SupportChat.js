// src/components/SupportChat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/** Inject minimal CSS once */
const STYLE_TAG_ID = "supportchat-styles";
function injectStyles() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const css = `
  .sc-card { width: 300px; border-radius: 12px; box-shadow: 0 10px 28px rgba(0,0,0,.12); overflow: hidden; border: 1px solid var(--sc-bd); background: var(--sc-bg); color: var(--sc-fg); font-size:12.5px; }
  .sc-header { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; font-weight:700; background: var(--sc-header-bg); color: var(--sc-header-fg); }
  .sc-body { height: 200px; overflow-y:auto; padding:8px; background: var(--sc-bg); -webkit-overflow-scrolling: touch; }
  .sc-quick { display:flex; flex-wrap:wrap; gap:6px; padding:6px 8px; border-top: 1px solid var(--sc-bd); border-bottom: 1px solid var(--sc-bd);}
  .sc-chip { font-size:11px; padding:3px 8px; border-radius:999px; border:1px solid var(--sc-bd-2); background: var(--sc-chip-bg); cursor:pointer; }
  .sc-footer { display:flex; gap:6px; padding:8px; border-top: 1px solid var(--sc-bd); align-items:flex-start; }
  .sc-input { flex:1; padding:6px 8px; border-radius:10px; border:1px solid var(--sc-bd-2); background: var(--sc-input-bg); color: var(--sc-fg); font-size:12.5px; }
  .sc-btn { padding:7px 10px; border-radius:10px; background:#2563eb; color:white; font-weight:700; border:none; cursor:pointer; font-size:12.5px; }
  .sc-btn:disabled { opacity:.6; cursor:default; }
  .sc-mini { display:grid; grid-template-columns:1fr; gap:6px; padding:6px 8px; border-top:1px solid var(--sc-bd); }
  .sc-mini-row { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .sc-field { padding:6px 8px; border-radius:10px; border:1px solid var(--sc-bd-2); background: var(--sc-input-bg); color: var(--sc-fg); font-size:12.5px; }
  .sc-bubble { display:inline-block; padding:7px 9px; border-radius:12px; font-size:12.5px; max-width: 90%; background: var(--sc-bubble-bot-bg); color: var(--sc-fg); line-height:1.35; white-space:pre-wrap; }
  .sc-bubble.user { background:#2563eb; color:#fff; }

  /* Wrapper: DO NOT block scrolling; allow taps to be responsive */
  .sc-wrap { position:fixed; inset: auto var(--sc-right) var(--sc-bottom) auto; z-index: 9999; touch-action: manipulation; }

  .sc-open { border-radius:999px; padding:9px 12px; background:#2563eb; color:white; font-weight:700; border:none; box-shadow:0 10px 30px rgba(0,0,0,.2); cursor:pointer; font-size:12.5px; }
  .sc-close { color:inherit; background:transparent; border:none; font-size:16px; cursor:pointer; padding:2px 4px; }
  .sc-list { display:flex; flex-direction:column; gap:6px; }
  .sc-row { text-align:left; }
  .sc-row.user { text-align:right; }

  /* Light theme variables */
  :root {
    --sc-bg:#ffffff; --sc-fg:#0f172a; --sc-bd:#e5e7eb; --sc-bd-2:#d1d5db;
    --sc-header-bg:#0f172a; --sc-header-fg:#fff;
    --sc-chip-bg:#f8fafc; --sc-input-bg:#ffffff; --sc-bubble-bot-bg:#f3f4f6;
    --sc-bottom: calc(16px + env(safe-area-inset-bottom));
    --sc-right: calc(16px + env(safe-area-inset-right));
  }
  /* Dark theme variables */
  .sc-dark, @media (prefers-color-scheme: dark) {
    --sc-bg:#0b0b0c; --sc-fg:#e5e7eb; --sc-bd:#1f2937; --sc-bd-2:#374151;
    --sc-header-bg:#000; --sc-header-fg:#fff;
    --sc-chip-bg:#141416; --sc-input-bg:#0f1113; --sc-bubble-bot-bg:#141416;
  }
  @media (max-width: 640px) {
    .sc-card { width: 92vw; }
    .sc-body { height: 34vh; }
  }`;
  const tag = document.createElement("style");
  tag.id = STYLE_TAG_ID;
  tag.textContent = css;
  document.head.appendChild(tag);
}

/** System/light/dark theme hook */
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

/* ---------- App-specific FAQs ---------- */
const DEFAULT_FAQ = [
  {
    q: "Set up Academics (Years → Terms → Classes → Subjects)",
    a:
`Start here (Admin/Owner):
1) Academics → Manage Academic Years → Add Year
2) Academics → Manage Academic Terms → Add Term(s) under the Year
3) Academics → Manage Classes → Add classes (e.g., Primary 1, JHS 2)
4) Academics → Manage Subjects → Add subjects
5) Academics → Assign Subjects → Assign subjects to classes
6) Academics → Manage Class Teacher → Assign a teacher to each class

Tip: Do this before attendance, exams, or billing.`
  },
  { q: "Add staff / teachers (incl. bulk import)", a:
`Admin/Owner:
• Dashboard → Manage Staff → Add New Staff
• Bulk Import supports: full_name, email, role[AD/HT/TE/AC], status, image_url
• Use "Reset & send" to email credentials if needed` },
  { q: "Add students / bulk import", a:
`Admin/Owner:
• Dashboard → Manage Students → Add
• Bulk import template: typical columns full_name, gender, class, guardian contact
• Ensure Classes exist first (see Academics setup)` },
  { q: "Fees: set up, collect & print bill", a:
`Accountant/Admin:
• Fees → Manage Fees: configure per class
• Fees → Fees Report: track payments
• Fees → Print Bill: generate student/class bills` },
  { q: "Exams: enter and print report", a:
`Teacher/Head/Admin:
• Examination → Enter Scores or Manage Exam Report
• Examination → Print Exam Report for term reports` },
  { q: "Attendance", a:
`Teacher/Admin:
• Attendance → Attendance Report (per class/date)
• Ensure Classes and Class Teachers are set first` },
  { q: "Change logo/signature", a:
`Settings:
• Admin: Upload School Logo
• Head Teacher: Upload Signature` },
  { q: "Upgrade/extend subscription (Paystack)", a:
`Admin:
• Settings → Plan & Billing → Upgrade / Extend Plan
• Premium uses assisted onboarding request (no online payment).` },
  { q: "Payment pending / verification stuck", a:
`If the Paystack popup closed early:
• Open Settings → Plan & Billing again
• Click "Verify Now" if you paid
• If still stuck, share your reference with support` },
  { q: "Can’t change the last Admin’s role", a:
`Safety rule: you can’t demote the only remaining Admin.
Add another Admin first, then change/remove the first one.` },
];

/* Fuzzy FAQ match */
function matchFaq(faqs, text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return null;
  const words = t.split(/\s+/).filter(Boolean);
  let best = null, bestScore = 0;

  for (const item of faqs) {
    const hay = `${item.q.toLowerCase()} ${item.a.toLowerCase()}`;
    let score = 0;
    if (hay.includes(t)) score += 6;
    for (const w of words) {
      if (w.length >= 3) {
        if (item.q.toLowerCase().includes(w)) score += 2;
        if (item.a.toLowerCase().includes(w)) score += 1;
      }
    }
    if (/start|setup|set\s*up|begin|onboard|first/i.test(t) && /academic/i.test(hay)) score += 3;
    if (score > bestScore) { best = item; bestScore = score; }
  }
  return bestScore >= 4 ? best : null;
}

export default function SupportChat({
  productName = "School Master Hub",
  supportEmail =
    process.env.REACT_APP_SUPPORT_EMAIL ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    "info@schoolmasterhub.net",
  faqs = DEFAULT_FAQ,
  theme = "system", // "light" | "dark" | "system"
  openByDefault = false,
  publicToken,
  autoCloseOnEscalate = true,
  autoCloseDelayMs = 1200,

  // Positioning / overlap controls
  fabOffset = { right: 16, bottom: 16 },
  mobileFabOffset = { right: 16, bottom: 88 },
  avoidDialogsOnMobile = true,
  draggableOnMobile = true,
}) {
  useTheme(theme);

  const [open, setOpen] = useState(openByDefault);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text:
        `Hi! I’m ${productName} Support.\n` +
        `Quick tip: start with Academics → Years → Terms → Classes → Subjects → Assign Subjects → Class Teacher.\n` +
        `You can tap a topic below or ask your question.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [needsHuman, setNeedsHuman] = useState(false);
  const [sending, setSending] = useState(false);

  // Mobile detection
  const isMobile = useRef(typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);

  // Position state
  const [fabPos, setFabPos] = useState(() =>
    isMobile.current ? { ...mobileFabOffset } : { ...fabOffset }
  );
  const [dragPreview, setDragPreview] = useState(null); // ephemeral during drag

  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  // Observe modals/dialogs to lift FAB on mobile
  useEffect(() => {
    if (!avoidDialogsOnMobile || !isMobile.current) return;

    const hasOpenDialog = () => {
      if (document.body.classList.contains("modal-open")) return true;
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
      return dialogs.some((el) => {
        const style = window.getComputedStyle(el);
        const hidden = el.getAttribute("aria-hidden") === "true";
        return !hidden && style.visibility !== "hidden" && style.display !== "none";
      });
    };

    const applyOffset = () => {
      const base = isMobile.current ? mobileFabOffset.bottom : fabOffset.bottom;
      const lift = hasOpenDialog() ? 72 : 0;
      setFabPos((p) => ({ ...p, bottom: Math.max(12, base + lift) }));
    };

    const mo = new MutationObserver(applyOffset);
    mo.observe(document.body, { attributes: true, childList: true, subtree: true });
    window.addEventListener("resize", applyOffset);
    applyOffset();

    return () => {
      mo.disconnect();
      window.removeEventListener("resize", applyOffset);
    };
  }, [avoidDialogsOnMobile, fabOffset.bottom, mobileFabOffset.bottom]);

  // Drag handler — bound ONLY to the FAB button, and only when CLOSED.
  useEffect(() => {
    if (!draggableOnMobile || !isMobile.current) return;
    const btn = btnRef.current;
    if (!btn) return;

    let startX = 0, startY = 0, origRight = 0, origBottom = 0;
    let moved = false;

    const MOVE_THRESHOLD = 6; // px to differentiate tap from drag

    const onPointerDown = (e) => {
      if (open) return; // drag only when closed
      // capture starting state
      const cs = getComputedStyle(wrapRef.current);
      origRight = parseFloat(cs.getPropertyValue("--sc-right")) || fabPos.right || 16;
      origBottom = parseFloat(cs.getPropertyValue("--sc-bottom")) || fabPos.bottom || 16;

      startX = e.clientX;
      startY = e.clientY;
      moved = false;

      // Use non-capture so click can still happen if no move
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp, { passive: true, once: true });
    };

    const onPointerMove = (e) => {
      const dx = startX - e.clientX;
      const dy = e.clientY - startY;
      const dist = Math.hypot(dx, dy);
      if (dist > MOVE_THRESHOLD) moved = true;

      const newRight = Math.max(8, (fabPos.right ?? 16) + dx);
      const newBottom = Math.max(8, (fabPos.bottom ?? 16) + dy);
      setDragPreview({ right: newRight, bottom: newBottom });
    };

    const onPointerUp = (e) => {
      window.removeEventListener("pointermove", onPointerMove);

      if (moved) {
        // Commit drag
        setFabPos((p) => ({
          right: dragPreview?.right ?? p.right,
          bottom: dragPreview?.bottom ?? p.bottom,
        }));
        setDragPreview(null);
      } else {
        // Treat as a tap to open
        setOpen(true);
      }
    };

    btn.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      btn.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [draggableOnMobile, isMobile.current, open, fabPos.right, fabPos.bottom, dragPreview]);

  // Apply CSS variables for position (supports safe-area)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const right = (dragPreview?.right ?? fabPos.right ?? 16) + "px";
    const bottom = (dragPreview?.bottom ?? fabPos.bottom ?? 16) + "px";
    el.style.setProperty("--sc-right", `calc(${right} + env(safe-area-inset-right))`);
    el.style.setProperty("--sc-bottom", `calc(${bottom} + env(safe-area-inset-bottom))`);
  }, [fabPos, dragPreview]);

  // Chat logic
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
    if (needsHuman) {
      void escalate();
      return;
    }
    void sendMessage();
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
    setNeedsHuman(true);
    setMessages(m => [
      ...m,
      {
        role: "bot",
        text:
          "I couldn’t find a perfect answer. Add your contact below and press Send to create a ticket. I’ll include our transcript.",
      },
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
          to: [supportEmail, email], // CC requester
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
      if (!resp.ok || json?.error) throw new Error(json?.error || "Send failed");
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
    <div ref={wrapRef} className="sc-wrap" aria-live="polite">
      {!open && (
        <button
          ref={btnRef}
          className="sc-open"
          // NOTE: no onClick here; the drag handler will open on tap (when not moved)
          aria-label="Open Support"
        >
          Support
        </button>
      )}

      {open && (
        <div
          className="sc-card"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} SupportChat`}
        >
          <div className="sc-header">
            <span>{productName} Support</span>
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

          {needsHuman && (
            <div className="sc-mini">
              <div className="sc-mini-row">
                <input ref={nameRef} className="sc-field" type="text" placeholder="Name (optional)" />
                <input ref={emailRef} className="sc-field" type="email" required placeholder="Email (required)" />
              </div>
              <input ref={subjectRef} className="sc-field" type="text" placeholder="Subject (optional)" />
            </div>
          )}

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
