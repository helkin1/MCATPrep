import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { resolveCategories, getCategory } from "@/lib/categories";
import { dayKey, addDays, formatTimeRange, uid } from "@/lib/time";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

function tint(hex, alpha) {
  const c = (hex || "#888").replace("#", "");
  if (c.length !== 6) return `rgba(136,136,136,${alpha})`;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

  const [committing, setCommitting] = useState(false);
  const commit = async () => {
    const items = resolvedItems.filter((it) => !excluded.has(it.idx));
    setCommitting(true);
    try {
      await onCommit(items);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-surface-2 border border-border rounded-xl p-4">
        <div className="text-[11px] uppercase tracking-[0.06em] text-text-3 font-medium mb-1">
          Parsed plan
        </div>
        <div className="text-[13px] text-text-1">{parsed.summary}</div>
        {parsed.warnings?.length > 0 && (
          <div className="mt-2 text-[12px] text-warn flex items-start gap-1.5">
            <span>⚠</span>
            <span>{parsed.warnings.join(" · ")}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div>
          <Label>Start date</Label>
          <Input
            type="date"
            size="sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <span className="text-[11px] text-text-3 mt-5">used for relative offsets</span>
      </div>

      <div className="max-h-[420px] overflow-y-auto space-y-4 pr-2 -mr-2">
        {grouped.length === 0 && (
          <div className="text-text-3 text-[13px] text-center py-10">
            No items could be placed on the calendar yet. Try adjusting the start date.
          </div>
        )}
        {grouped.map(([date, items]) => (
          <div key={date}>
            <div className="text-[11px] uppercase tracking-[0.06em] text-text-3 font-medium mb-1.5 tabular">
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
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] cursor-pointer transition-colors",
                      "hover:bg-surface-2",
                      isExcluded && "opacity-40"
                    )}
                  >
                    <span className="relative inline-flex flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => toggle(it.idx)}
                        className="peer appearance-none w-4 h-4 rounded-[4px] border border-border-strong bg-surface-2 checked:bg-accent-strong checked:border-accent-strong transition-colors cursor-pointer"
                      />
                      <svg
                        viewBox="0 0 16 16"
                        className="absolute inset-0 w-4 h-4 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                        fill="none"
                        stroke="var(--text-inverse)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3.5 8.5l3 3 6-6" />
                      </svg>
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[11px] font-medium border-l-2"
                      style={{
                        background: tint(cat.color, 0.16),
                        borderLeftColor: cat.color,
                        color: "var(--text-1)",
                      }}
                    >
                      {cat.label}
                    </span>
                    <span className="flex-1 truncate text-text-1">{it.title}</span>
                    <span className="font-mono tabular text-[11px] text-text-3">
                      {formatTimeRange(it.start, it.end)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="ghost" onClick={onBack} disabled={committing}>
          ← Back
        </Button>
        <Button
          onClick={commit}
          disabled={grouped.length === 0 || committing}
          size="md"
        >
          {committing && <Loader2 size={14} className="animate-spin" />}
          {committing
            ? "Saving…"
            : `Apply ${resolvedItems.length - excluded.size} blocks`}
        </Button>
      </div>
    </div>
  );
}
