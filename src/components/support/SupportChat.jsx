import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, X, Loader2, CheckCircle2, AlertCircle, LifeBuoy } from 'lucide-react';
import { useAuth } from '../../AuthContext';

const EMAIL_API_BASE =
  process.env.REACT_APP_EMAIL_API_BASE ||
  'https://schoolmasterhub.vercel.app'; // adjust if needed

const SUPPORT_TO = process.env.REACT_APP_SUPPORT_EMAIL || 'support@schoolmasterhub.net';
const STORAGE_KEYS = {
  open: 'smh:support:open',
  draft: 'smh:support:draft',
  category: 'smh:support:category',
  lastSentAt: 'smh:support:lastSentAt',
};

const CATEGORIES = ['General', 'Technical issue', 'Billing', 'Feature request', 'Other'];

function nowISO() {
  return new Date().toISOString();
}

function clamp(min, v, max) {
  return Math.max(min, Math.min(max, v));
}

export default function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const lastSentRef = useRef(0);

  // restore persisted UI
  useEffect(() => {
    try {
      const o = localStorage.getItem(STORAGE_KEYS.open);
      const d = localStorage.getItem(STORAGE_KEYS.draft);
      const c = localStorage.getItem(STORAGE_KEYS.category);
      if (o === '1') setOpen(true);
      if (d) setMessage(d);
      if (c && CATEGORIES.includes(c)) setCategory(c);
      const ls = Number(localStorage.getItem(STORAGE_KEYS.lastSentAt) || '0');
      if (Number.isFinite(ls)) lastSentRef.current = ls;
    } catch {}
  }, []);

  // persist draft & state
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.draft, message); } catch {}
  }, [message]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.category, category); } catch {}
  }, [category]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.open, open ? '1' : '0'); } catch {}
  }, [open]);

  const meta = useMemo(() => {
    const role = user?.userType ?? user?.role ?? '';
    const school =
      user?.schoolName ?? user?.school?.name ?? user?.school_name ?? '';
    const schoolId =
      user?.schoolId ?? user?.school_id ?? user?.school?.id ?? '';
    const email = user?.email ?? user?.EMAIL ?? '';
    const name = user?.name ?? user?.full_name ?? user?.FULL_NAME ?? '';
    return {
      name,
      role,
      email,
      school,
      schoolId,
      userId: user?.id ?? user?.user_id ?? user?.USER_ID ?? '',
      page: window.location.pathname + window.location.search,
      ua: navigator.userAgent,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      at: nowISO(),
    };
  }, [user]);

  const subject = useMemo(() => {
    const s = meta.school ? ` ${meta.school}` : '';
    const r = meta.role ? ` • ${meta.role}` : '';
    return `[Support]${s}${r} — ${category}`;
  }, [category, meta]);

  const buildHtml = () => {
    const escape = (t = '') =>
      String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const lines = escape(message).split('\n').map(l => `<p style="margin:0 0 8px">${l || '&nbsp;'}</p>`).join('');
    return `
      <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.4;font-size:14px;color:#111">
        <h2 style="margin:0 0 12px">${escape(subject)}</h2>
        <div style="padding:12px;border:1px solid #eee;border-radius:8px;background:#fafafa">${lines}</div>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee" />
        <h3 style="margin:0 0 8px">Diagnostics</h3>
        <table style="border-collapse:collapse;width:100%">
          ${Object.entries(meta).map(([k,v]) => `
            <tr>
              <td style="padding:6px 8px;border:1px solid #eee;background:#fbfbfb;width:140px"><strong>${escape(k)}</strong></td>
              <td style="padding:6px 8px;border:1px solid #eee">${escape(String(v))}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  };

  const buildText = () => {
    const diag = Object.entries(meta).map(([k,v]) => `${k}: ${v}`).join('\n');
    return `${subject}\n\n${message}\n\n---\n${diag}\n`;
  };

  const sendMail = async () => {
    setError('');
    setSuccess('');

    const trimmed = message.trim();
    if (!trimmed) { setError('Please type a message.'); return; }

    // simple rate limit: 1 send / 60s
    const now = Date.now();
    const waitMs = clamp(0, 60_000 - (now - lastSentRef.current), 60_000);
    if (waitMs > 0) {
      setError(`Please wait ${Math.ceil(waitMs/1000)}s before sending again.`);
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${EMAIL_API_BASE}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: SUPPORT_TO,
          subject,
          text: buildText(),
          html: buildHtml(),
          replyTo: meta.email || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      lastSentRef.current = Date.now();
      try { localStorage.setItem(STORAGE_KEYS.lastSentAt, String(lastSentRef.current)); } catch {}
      setSuccess('Thanks! Your message has been sent to support.');
      setMessage(''); // clear draft
      try { localStorage.removeItem(STORAGE_KEYS.draft); } catch {}
    } catch (e) {
      setError(e?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !sending) {
      e.preventDefault();
      sendMail();
    }
  };

  return (
    <>
      {/* Floating launcher button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-50 bottom-5 right-5 inline-flex items-center gap-2 px-4 py-3 rounded-full shadow-lg bg-indigo-600 text-white hover:bg-indigo-700"
          aria-label="Open support chat"
        >
          <LifeBuoy className="h-5 w-5" />
          <span className="hidden sm:inline">Support</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed z-50 bottom-5 right-5 w-[92vw] max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-indigo-600" />
              <div>
                <div className="text-sm font-semibold">Support</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Hi{meta.name ? `, ${meta.name}` : ''}! How can we help?
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {/* Category */}
            <label className="block text-sm">
              <span className="text-gray-700 dark:text-gray-300">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            {/* Message box */}
            <label className="block text-sm">
              <span className="text-gray-700 dark:text-gray-300">Message</span>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Describe the issue or request. Include steps to reproduce, expected result, etc."
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 resize-y"
              />
              <div className="mt-1 text-xs text-gray-500">
                Press <kbd className="px-1 py-0.5 border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 border rounded">Enter</kbd> to send
              </div>
            </label>

            {/* Alerts */}
            {error && (
              <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-900/30 rounded-lg p-2 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-900/30 rounded-lg p-2 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <span>{success}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-xs text-gray-500">
            </div>
            <button
              onClick={sendMail}
              disabled={sending || !message.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
