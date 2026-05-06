import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { formatDuration, timeToMinutes, uid } from "@/lib/time";
import { Button, Input, SectionLabel } from "@/components/ui";
import { cn } from "@/lib/utils";

export function Sidebar({ blocks, todos, categories, onTodosChange, onApplyTemplate, templates, onSaveAsTemplate }) {
  const [todoText, setTodoText] = useState("");

  const stats = (() => {
    let study = 0, total = 0;
    const byCat = {};
    for (const b of blocks) {
      const m = timeToMinutes(b.end) - timeToMinutes(b.start);
      if (m <= 0) continue;
      total += m;
      byCat[b.category] = (byCat[b.category] || 0) + m;
      const cat = categories.find((c) => c.id === b.category);
      if (cat?.studyish) study += m;
    }
    return { study, total, byCat };
  })();

  const addTodo = () => {
    if (!todoText.trim()) return;
    onTodosChange([...todos, { id: uid(), text: todoText.trim(), done: false }]);
    setTodoText("");
  };

  // Sorted breakdown for the stacked bar + legend
  const breakdown = Object.entries(stats.byCat)
    .map(([id, mins]) => ({ id, mins, cat: categories.find((c) => c.id === id) }))
    .filter((x) => x.cat)
    .sort((a, b) => b.mins - a.mins);

  return (
    <aside className="w-[340px] flex-shrink-0 border-l border-border bg-surface-1 overflow-y-auto p-5 space-y-7">
      {/* Todos */}
      <section>
        <SectionLabel>To-dos</SectionLabel>
        <div className="flex gap-2 mb-3">
          <Input
            size="sm"
            value={todoText}
            onChange={(e) => setTodoText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="Add a to-do…"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={addTodo}
            aria-label="Add to-do"
            className="px-2.5"
          >
            <Plus size={14} />
          </Button>
        </div>
        <div className="space-y-1">
          {todos.length === 0 && (
            <div className="text-[12px] text-text-3 py-1">
              No to-dos for this day yet.
            </div>
          )}
          {todos.map((t) => (
            <label
              key={t.id}
              className="group flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-surface-2 cursor-pointer transition-colors"
            >
              <span className="relative inline-flex flex-shrink-0">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() =>
                    onTodosChange(
                      todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
                    )
                  }
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
                className={cn(
                  "flex-1 text-[13px] transition-colors",
                  t.done ? "line-through text-text-3" : "text-text-1"
                )}
              >
                {t.text}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onTodosChange(todos.filter((x) => x.id !== t.id));
                }}
                aria-label="Delete to-do"
                className="text-text-3 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </label>
          ))}
        </div>
      </section>

      {/* Daily summary */}
      <section>
        <SectionLabel>Daily summary</SectionLabel>
        {blocks.length === 0 ? (
          <div className="text-[12px] text-text-3">
            Click and drag in the schedule to add a block.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Headline numbers */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-2 border border-border rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-[0.06em] text-text-3 font-medium">
                  Study
                </div>
                <div className="font-mono tabular text-[18px] font-semibold text-text-1 mt-0.5">
                  {formatDuration(stats.study)}
                </div>
              </div>
              <div className="bg-surface-2 border border-border rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-[0.06em] text-text-3 font-medium">
                  Scheduled
                </div>
                <div className="font-mono tabular text-[18px] font-semibold text-text-1 mt-0.5">
                  {formatDuration(stats.total)}
                </div>
              </div>
            </div>

            {/* Stacked bar */}
            {stats.total > 0 && (
              <div className="flex h-2 rounded-full overflow-hidden bg-surface-3">
                {breakdown.map(({ id, mins, cat }) => (
                  <div
                    key={id}
                    style={{
                      width: `${(mins / stats.total) * 100}%`,
                      background: cat.color,
                    }}
                    title={`${cat.label} · ${formatDuration(mins)}`}
                  />
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="space-y-1">
              {breakdown.map(({ id, mins, cat }) => (
                <div
                  key={id}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="flex items-center gap-2 text-text-2">
                    <span
                      className="inline-block w-2 h-2 rounded-[3px]"
                      style={{ background: cat.color }}
                    />
                    {cat.label}
                  </span>
                  <span className="font-mono tabular text-text-2">
                    {formatDuration(mins)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Templates */}
      <section>
        <SectionLabel>Templates</SectionLabel>
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveAsTemplate}
          disabled={blocks.length === 0}
          className="w-full justify-start"
        >
          <Plus size={13} /> Save current day as template
        </Button>
        {templates?.daily?.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="text-[10px] uppercase tracking-[0.06em] text-text-3 font-medium px-1 mb-1">
              Apply to today
            </div>
            {templates.daily.map((t) => (
              <button
                key={t.id}
                onClick={() => onApplyTemplate(t)}
                className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-border hover:border-border-strong px-3 py-2 rounded-md text-[12px] transition-colors flex items-center justify-between gap-2"
              >
                <span className="truncate text-text-1 font-medium">{t.name}</span>
                <span className="font-mono tabular text-text-3 flex-shrink-0">
                  {t.blocks.length} blocks
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
