import React, { useEffect, useState } from "react";

export default function SupportTicketDialog({ open, onClose, user }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // recipients (adjust if needed)
  const supportRecipients = ["info@schoolmasterhub.net"];

  // Resolve user context (NOT shown, only passed)
  const schoolId =
    user?.schoolId ?? user?.school_id ?? user?.school?.id ?? "N/A";
  const schoolName =
    user?.schoolName ?? user?.school?.name ?? user?.school_name ?? "N/A";
  const email = user?.email ?? user?.EMAIL ?? "N/A";
  const name =
    user?.name ?? user?.fullName ?? user?.FULL_NAME ?? user?.username ?? "N/A";
  const role = user?.userType ?? user?.role ?? "N/A";

  // Pre-fill subject each time dialog opens
  useEffect(() => {
    if (open) {
      setResult(null);
      if (!subject) {
        const who =
          user?.schoolName ||
          user?.school?.name ||
          user?.school_name ||
          user?.name ||
          "User";
        setSubject(`Support ticket from ${who}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(e) {
    e?.preventDefault?.();
    if (!subject.trim() || !message.trim()) {
      setResult({ ok: false, msg: "Subject and message are required." });
      return;
    }
    setSending(true);
    setResult(null);

    // Build a header that includes the hidden context
    const header =
      `From: ${name} (${email})\n` +
      `School ID: ${schoolId}\n` +
      `School Name: ${schoolName}\n` +
      `Role: ${role}\n\n`;

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: supportRecipients,
          subject,
          fromName: name || "School Master Hub User",
          message: header + message, // pass hidden context + user message
          // (optional) also pass as structured fields if your backend wants them:
          meta: { schoolId, schoolName, email, name, role },
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setResult({ ok: true, msg: "Ticket sent. We’ll reach out by email." });
        setMessage("");
      } else {
        throw new Error(data?.error || "Failed to send");
      }
    } catch (err) {
      setResult({ ok: false, msg: err?.message || "Failed to send ticket" });
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !sending && onClose?.()}
      />
      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-900 w-[92%] max-w-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-lg font-semibold mb-1">Contact Support</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Describe the issue or request. We’ll reply via your account email.
        </p>

        <form onSubmit={submit} className="space-y-3">
          {/* Hidden fields: included in the request but not shown */}
          <input type="hidden" name="schoolId" value={String(schoolId)} />
          <input type="hidden" name="schoolName" value={String(schoolName)} />
          <input type="hidden" name="email" value={String(email)} />
          <input type="hidden" name="name" value={String(name)} />
          <input type="hidden" name="role" value={String(role)} />

          <div>
            <label className="text-sm block mb-1">Subject</label>
            <input
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Cannot assign subjects"
              disabled={sending}
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Message</label>
            <textarea
              className="w-full min-h-[140px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened"
              disabled={sending}
            />
          </div>

          {result && (
            <div
              className={`text-sm px-3 py-2 rounded-md ${
                result.ok
                  ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              }`}
            >
              {result.msg}
            </div>
          )}

          <div className="flex items-center gap-2 justify-end pt-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => onClose?.()}
              disabled={sending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
