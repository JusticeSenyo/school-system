import React, { useEffect, useState } from "react";

export default function SupportTicketDialog({ open, onClose, user }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

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
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const supportRecipients = ["support@schoolmasterhub.net"]; // change if needed

  const schoolId =
    user?.schoolId ?? user?.school_id ?? user?.school?.id ?? "N/A";
  const schoolName =
    user?.schoolName ?? user?.school?.name ?? user?.school_name ?? "N/A";
  const email = user?.email ?? user?.EMAIL ?? "N/A";
  const name =
    user?.name ?? user?.fullName ?? user?.FULL_NAME ?? user?.username ?? "N/A";
  const role = user?.userType ?? user?.role ?? "N/A";

  async function submit(e) {
    e?.preventDefault?.();
    if (!subject.trim() || !message.trim()) {
      setResult({ ok: false, msg: "Subject and message are required." });
      return;
    }
    setSending(true);
    setResult(null);

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
          message: header + message,
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

        {/* Read-only user context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-xs">
          <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <div className="text-gray-500 dark:text-gray-400">School ID</div>
            <div className="font-medium truncate">{String(schoolId)}</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <div className="text-gray-500 dark:text-gray-400">School Name</div>
            <div className="font-medium truncate">{String(schoolName)}</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <div className="text-gray-500 dark:text-gray-400">User</div>
            <div className="font-medium truncate">{String(name)}</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <div className="text-gray-500 dark:text-gray-400">Email</div>
            <div className="font-medium truncate">{String(email)}</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 sm:col-span-2">
            <div className="text-gray-500 dark:text-gray-400">Role</div>
            <div className="font-medium truncate">{String(role)}</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
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
              placeholder="Tell us what happened, steps to reproduce, page/IDs, etc."
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
