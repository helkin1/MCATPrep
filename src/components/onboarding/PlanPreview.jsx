import { useMemo, useState } from "react";
import { resolveCategories, getCategory, textOn } from "@/lib/categories";
import { dayKey, addDays, formatTimeRange, uid } from "@/lib/time";

/**
 * Show parsed items grouped by date, let user toggle items off, then commit.
 * Items can be absolute-dated or offset-based; we resolve offsets against
 * the user's selected start date.
 */
export function PlanPreview({ parsed, onCommit, onBack, defaultStartDate }) {
  const [startDate, setStartDate] = useState(defaultStartDate || dayKey(new Date()));
  const [excluded, setExcluded] = useState(new Set());
  const categories = resolveCategories();

  const resolvedItems = useMemo(() => {
    return (parsed.items || []).map((it, idx) => {
      let date = it.date;
      if (!date && typeof it.day_offset === "number") {
        const d = addDays(new Date(startDate + "T00:00"), it.day_offset);
        date = dayKey(d);
      }
      // If only duration given, place sequentially starting at 9am
      let start = it.start;
      let end = it.end;
      if (!start && it.duration_minutes) {
        start = "09:00";
        const m = 9 * 60 + it.duration_minutes;
        const hh = Math.min(23, Math.floor(m / 60));
        const mm = m % 60;
        end = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      }
      return {
        idx,
        id: uid(),
        date,
        start: start || "09:00",
        end: end || "10:00",
        title: it.title || "Untitled",
        category: it.category || "personal",
        notes: it.notes || "",
      };
    });
  }, [parsed, startDate]);

  const grouped = useMemo(() => {
    const m = new Map();
    for (const it of resolvedItems) {
      if (!it.date) continue;
      if (!m.has(it.date)) m.set(it.date, []);
      m.get(it.date).push(it);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [resolvedItems]);

  const toggle = (idx) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const commit = () => {
    const items = resolvedItems.filter((it) => !excluded.has(it.idx));
    onCommit(items);
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-800/50 rounded-md p-3 text-sm">
        <div className="font-medium text-zinc-100">Parsed plan</div>
        <div className="text-zinc-400 mt-1">{parsed.summary}</div>
        {parsed.warnings?.length > 0 && (
          <div className="mt-2 text-xs text-amber-400">
            ⚠ {parsed.warnings.join(" · ")}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="text-zinc-400">Start date:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-sm"
        />
        <span className="text-xs text-zinc-500">(used for relative offsets)</span>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
        {grouped.length === 0 && (
          <div className="text-zinc-500 text-sm text-center py-8">
            No items could be placed on the calendar yet. Try adjusting the start date.
          </div>
        )}
        {grouped.map(([date, items]) => (
          <div key={date}>
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">
              {new Date(date + "T00:00").toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="space-y-1">
              {items.map((it) => {
                const cat = getCategory(categories, it.category);
                const isExcluded = excluded.has(it.idx);
                return (
                  <label
                    key={it.id}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer ${
                      isExcluded ? "opacity-40" : ""
                    } hover:bg-zinc-800/50`}
                  >
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => toggle(it.idx)}
                    />
                    <div
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: cat.color, color: textOn(cat.color) }}
                    >
                      {cat.label}
                    </div>
                    <div className="flex-1 truncate">{it.title}</div>
                    <div className="text-xs text-zinc-500">{formatTimeRange(it.start, it.end)}</div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-2 pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-md text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={commit}
          disabled={grouped.length === 0}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md text-sm"
        >
          Apply {resolvedItems.length - excluded.size} blocks to my calendar
        </button>
      </div>
    </div>
  );
}
