// src/components/dashboard/EventsCalendar.js
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths = (d, m) => new Date(d.getFullYear(), d.getMonth() + m, 1);
const sameDate = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function buildMonthMatrix(viewDate) {
  const first = startOfMonth(viewDate); // first day of this month
  const last = endOfMonth(viewDate);    // last day of this month
  const firstWeekStart = new Date(first);
  firstWeekStart.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // Mon-start grid

  const weeks = [];
  let cur = new Date(firstWeekStart);
  while (cur <= last || cur.getDay() !== 1) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
    if (cur > last && cur.getDay() === 1) break;
  }
  return weeks;
}

export default function EventsCalendar({ events = [] }) {
  const [viewDate, setViewDate] = useState(new Date());

  const eventsByDay = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      const d = new Date(e.event_date ?? e.EVENT_DATE);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        id: e.event_id ?? e.EVENT_ID,
        name: e.event_name ?? e.EVENT_NAME ?? "",
      });
    });
    return map;
  }, [events]);

  const monthMatrix = useMemo(() => buildMonthMatrix(viewDate), [viewDate]);

  const monthLabel = viewDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-indigo-600" />
        <h3 className="font-semibold">Upcoming Events</h3>
        <div className="ml-auto inline-flex items-center gap-2">
          <button
            onClick={() => setViewDate((d) => addMonths(d, -1))}
            className="p-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[9rem] text-center text-sm font-medium">
            {monthLabel}
          </div>
          <button
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            className="p-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week headers */}
      <div className="grid grid-cols-7 text-xs px-3 pt-3 text-gray-500 dark:text-gray-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 m-3 rounded overflow-hidden">
        {monthMatrix.flat().map((day, idx) => {
          const inMonth = day.getMonth() === viewDate.getMonth();
          const key = day.toISOString().slice(0, 10);
          const today = sameDate(day, new Date());
          const dayEvents = eventsByDay.get(key) || [];
          return (
            <div
              key={idx}
              className={`min-h-[92px] bg-white dark:bg-gray-800 p-2 ${inMonth ? "" : "opacity-50"} relative`}
            >
              <div className="text-right text-xs">
                <span
                  className={`inline-block px-2 py-0.5 rounded ${
                    today ? "bg-indigo-600 text-white" : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              {/* Events */}
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="truncate text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-700"
                    title={e.name}
                  >
                    {e.name}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
