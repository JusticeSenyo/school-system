// src/pages/ManageEvents.js
import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useAuth } from "../AuthContext";
import {
  CalendarDays,
  Plus,
  Save,
  X,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

/* ===== ORDS base ===== */
const HOST =
  "https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords/schools";

/* ===== Endpoints (GET only) ===== */
const EVENTS_GET_API    = `${HOST}/academic/get/event/`;     // GET  ?p_school_id
const EVENT_ADD_API     = `${HOST}/academic/add/event/`;     // GET  ?p_school_id=&p_event_name=&p_event_date=
const EVENT_UPDATE_API  = `${HOST}/academic/update/event/`;  // GET  ?p_event_id=&p_school_id=&p_event_name=&p_event_date=
const EVENT_DELETE_API  = `${HOST}/academic/delete/event/`;  // GET  ?p_event_id=

/* ===== helpers ===== */
const toISODate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const buildUrl = (base, params) => {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) qs.set(k, String(v));
  });
  return `${base}?${qs.toString()}`;
};

// GET fetch that avoids custom headers (to prevent CORS preflight)
const getText = async (url) => {
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const txt = (await res.text())?.trim();
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(txt || "").slice(0, 160)}`);
  return txt;
};

const parseArray = (rawText) => {
  try {
    const d = JSON.parse(rawText);
    return Array.isArray(d) ? d : Array.isArray(d.items) ? d.items : [];
  } catch {
    return [];
  }
};

export default function ManageEvents() {
  const { user } = useAuth() || {};
  const schoolId =
    user?.schoolId ?? user?.school_id ?? user?.school?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  const [events, setEvents] = useState([]); // [{event_id, event_name, event_date, school_id}]
  const [editingId, setEditingId] = useState(null);

  // form state (add/edit)
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(toISODate(new Date()));

  const resetForm = () => {
    setEditingId(null);
    setEventName("");
    setEventDate(toISODate(new Date()));
  };

  const loadEvents = async () => {
    if (!schoolId) {
      setErr("Missing school ID — please re-login.");
      setEvents([]);
      setLoading(false);
      return;
    }
    setRefreshing(true);
    setErr("");
    try {
      const url = buildUrl(EVENTS_GET_API, { p_school_id: schoolId });
      const rows = parseArray(await getText(url));
      const norm = rows
        .map((r) => ({
          event_id: r.event_id ?? r.EVENT_ID,
          event_name: r.event_name ?? r.EVENT_NAME ?? "",
          event_date: r.event_date ?? r.EVENT_DATE ?? "",
          school_id: r.school_id ?? r.SCHOOL_ID ?? schoolId,
        }))
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
      setEvents(norm);
    } catch (e) {
      setErr(e?.message || "Failed to load events.");
      setEvents([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!eventName?.trim() || !eventDate) return;

    setErr("");
    try {
      if (editingId) {
        // UPDATE (GET)
        const url = buildUrl(EVENT_UPDATE_API, {
          p_event_id: editingId,
          p_school_id: schoolId,
          p_event_name: eventName.trim(),
          p_event_date: eventDate, // YYYY-MM-DD
        });
        await getText(url);
      } else {
        // ADD (GET)
        const url = buildUrl(EVENT_ADD_API, {
          p_school_id: schoolId,
          p_event_name: eventName.trim(),
          p_event_date: eventDate, // YYYY-MM-DD
        });
        await getText(url);
      }
      resetForm();
      await loadEvents();
    } catch (e1) {
      setErr(e1?.message || "Failed to save event.");
    }
  };

  const onEdit = (ev) => {
    setEditingId(ev.event_id);
    setEventName(ev.event_name || "");
    setEventDate(toISODate(ev.event_date));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (ev) => {
    if (!window.confirm(`Delete event "${ev.event_name}"?`)) return;
    setErr("");
    try {
      // DELETE (GET)
      const url = buildUrl(EVENT_DELETE_API, { p_event_id: ev.event_id });
      await getText(url);
      await loadEvents();
    } catch (e1) {
      setErr(e1?.message || "Failed to delete event.");
    }
  };

  return (
    <DashboardLayout title="Manage Events">
      {/* Form */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold">{editingId ? "Edit Event" : "Create Event"}</h3>
          <button
            className="ml-auto inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={loadEvents}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {err && (
          <div className="mb-4 inline-flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-sm grid gap-1 sm:col-span-2">
            <span className="text-gray-700 dark:text-gray-300">Event Name</span>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g., PTA Meeting"
              className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
              required
            />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700 dark:text-gray-300">Event Date</span>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-700"
              required
            />
          </label>

          <div className="sm:col-span-3 flex gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Save Changes" : "Add Event"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Events list */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold">Upcoming Events</h3>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading…</div>
        ) : events.length === 0 ? (
          <div className="p-4 text-sm text-gray-600 dark:text-gray-300">No events found.</div>
        ) : (
          <ul className="divide-y dark:divide-gray-700">
            {events.map((ev) => (
              <li key={ev.event_id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {ev.event_name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {new Date(ev.event_date).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => onEdit(ev)}
                  className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => onDelete(ev)}
                  className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded border border-rose-300 text-rose-700 hover:bg-rose-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
