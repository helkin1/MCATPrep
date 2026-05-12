import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Sparkles, RotateCcw } from "lucide-react";
import { resolveCategories, getCategory } from "@/lib/categories";
import { dayKey, addDays, formatTimeRange, uid } from "@/lib/time";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

function tint(hex, alpha) {
  const c = (hex || "#888").replace("#", "");
  if (c.length !== 6) return `rgba(136,136,136,${alpha})`;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const SUGGESTIONS = [
  "Move CARS to mornings",
  "Add a full-length every other Saturday",
  "Skip Sundays",
  "Weight Physics heavier",
  "Shorten study blocks to 90 minutes",
];

export function PlanPreview({ parsed, onCommit, onBack, defaultStartDate, examDate }) {
  const [startDate, setStartDate] = useState(defaultStartDate || dayKey(new Date()));
  const [excluded, setExcluded] = useState(new Set());
  const categories = resolveCategories();

  // The "working" items: starts as the parsed result, then gets replaced
  // wholesale by each refine round-trip. Each item keeps its own stable
  // synthetic id so React keys stay valid across replacements.
  const [items, setItems] = useState(() =>
    (parsed.items || []).map((it) => ({ ...it, _id: uid() }))
  );

  const [summary, setSummary] = useState(parsed.summary || "");
  const [warnings, setWarnings] = useState(parsed.warnings || []);

  // Chat state for the refinement panel.
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        parsed.summary ||
        "Here's the plan I drafted. Tell me what to change — times, days, weighting, anything.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, refining]);

  const resolvedItems = useMemo(() => {
    return items.map((it, idx) => {
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
        id: it._id,
        date,
        start: start || "09:00",
        end: end || "10:00",
        title: it.title || "Untitled",
        category: it.category || "personal",
        notes: it.notes || "",
      };
    });
  }, [items, startDate]);

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

  const sendRefine = async (text) => {
    const message = (text ?? draft).trim();
    if (!message || refining) return;

    setDraft("");
    setRefineError(null);

    const userTurn = { role: "user", content: message };
    setMessages((m) => [...m, userTurn]);
    setRefining(true);

    try {
      // Strip the synthetic _id before sending to the API.
      const apiItems = items.map(({ _id, ...rest }) => rest);
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/refine-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: apiItems,
          message,
          history,
          examDate,
          startDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refine plan");

      // Replace items; assign fresh ids so React keys are stable.
      setItems((data.items || []).map((it) => ({ ...it, _id: uid() })));
      setExcluded(new Set());
      setWarnings(data.warnings || []);
      setSummary(data.reply || summary);
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "Done." }]);
    } catch (e) {
      setRefineError(e.message);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Couldn't apply that: ${e.message}`, error: true },
      ]);
    } finally {
      setRefining(false);
    }
  };

  const [committing, setCommitting] = useState(false);
  const commit = async () => {
    const out = resolvedItems.filter((it) => !excluded.has(it.idx));
    setCommitting(true);
    try {
      await onCommit(out);
    } finally {
      setCommitting(false);
    }
  };

  const includedCount = resolvedItems.length - excluded.size;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-surface-2 border border-border rounded-xl p-4">
        <div className="text-[11px] uppercase tracking-[0.06em] text-text-3 font-medium mb-1">
          Current plan
        </div>
        <div className="text-[13px] text-text-1">{summary}</div>
        {warnings.length > 0 && (
          <div className="mt-2 text-[12px] text-warn flex items-start gap-1.5">
            <span>⚠</span>
            <span>{warnings.join(" · ")}</span>
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

      {/* Two-column: preview list + refine chat */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Preview list */}
        <div className="bg-surface-2/40 border border-border rounded-xl p-3 max-h-[480px] overflow-y-auto">
          {grouped.length === 0 && (
            <div className="text-text-3 text-[13px] text-center py-10">
              No items could be placed on the calendar yet. Try adjusting the start date or ask Claude to fix it.
            </div>
          )}
          <div className="space-y-4">
            {grouped.map(([date, dayItems]) => (
              <div key={date}>
                <div className="text-[11px] uppercase tracking-[0.06em] text-text-3 font-medium mb-1.5 tabular px-1">
                  {new Date(date + "T00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="space-y-1">
                  {dayItems.map((it) => {
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
        </div>

        {/* Chat panel */}
        <div className="bg-surface-1 border border-border rounded-xl flex flex-col max-h-[480px]">
          <div className="px-3.5 py-2.5 border-b border-border flex items-center gap-2">
            <Sparkles size={13} className="text-accent" />
            <span className="text-[12px] font-medium text-text-1">Refine with Claude</span>
            <span className="ml-auto font-mono tabular text-[11px] text-text-3">
              {items.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5">
            {messages.map((m, i) => (
              <ChatBubble key={i} message={m} />
            ))}
            {refining && (
              <div className="flex items-center gap-2 text-[12px] text-text-2 px-2 py-1">
                <Loader2 size={12} className="animate-spin" />
                Thinking…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggestion chips (only show when no user messages yet) */}
          {messages.filter((m) => m.role === "user").length === 0 && (
            <div className="px-3.5 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendRefine(s)}
                  disabled={refining}
                  className="text-[11px] text-text-2 hover:text-text-1 bg-surface-2 hover:bg-surface-3 border border-border rounded-full px-2.5 py-1 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {refineError && (
            <div className="mx-3.5 mb-2 text-[11px] text-danger bg-[color:var(--danger-soft)] border border-danger/30 rounded-md px-2.5 py-1.5">
              {refineError}
            </div>
          )}

          <div className="p-2.5 border-t border-border flex items-end gap-2">
            <Textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  sendRefine();
                }
              }}
              placeholder="Ask Claude to adjust your plan…"
              className="!min-h-[44px] resize-none text-[12px]"
              disabled={refining}
            />
            <Button
              size="sm"
              onClick={() => sendRefine()}
              disabled={!draft.trim() || refining}
              aria-label="Send"
              className="px-2.5"
            >
              <Send size={14} />
            </Button>
          </div>
        </div>
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
          {committing ? "Saving…" : `Apply ${includedCount} blocks`}
        </Button>
      </div>
    </div>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-lg px-2.5 py-1.5 text-[12.5px] leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-accent-strong text-text-inverse"
            : message.error
            ? "bg-[color:var(--danger-soft)] text-danger border border-danger/30"
            : "bg-surface-2 text-text-1 border border-border"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
