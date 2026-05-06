import { useState } from "react";
import { Trash2 } from "lucide-react";
import { formatDuration, timeToMinutes, uid } from "@/lib/time";
import { textOn } from "@/lib/categories";

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

  return (
    <div className="w-80 flex-shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-y-auto p-4 space-y-5">
      <section>
        <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-2">To-dos</h3>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={todoText}
            onChange={(e) => setTodoText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="Add a to-do…"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-sm focus:border-blue-500 outline-none"
          />
          <button
            onClick={addTodo}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 rounded-md"
          >
            +
          </button>
        </div>
        <div className="space-y-1">
          {todos.length === 0 && (
            <div className="text-xs text-zinc-500 py-2">No to-dos for this day yet.</div>
          )}
          {todos.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-800 rounded-md px-2 py-1.5"
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() =>
                  onTodosChange(
                    todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
                  )
                }
              />
              <span className={`flex-1 text-sm ${t.done ? "line-through text-zinc-500" : ""}`}>
                {t.text}
              </span>
              <button
                onClick={() => onTodosChange(todos.filter((x) => x.id !== t.id))}
                className="text-zinc-500 hover:text-red-400"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Daily summary</h3>
        {blocks.length === 0 ? (
          <div className="text-xs text-zinc-500">
            Click and drag in the schedule to add a block.
          </div>
        ) : (
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">Study time</span>
              <span>{formatDuration(stats.study)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total scheduled</span>
              <span>{formatDuration(stats.total)}</span>
            </div>
            <div className="border-t border-zinc-800 my-1" />
            {Object.entries(stats.byCat)
              .sort((a, b) => b[1] - a[1])
              .map(([id, mins]) => {
                const cat = categories.find((c) => c.id === id);
                if (!cat) return null;
                return (
                  <div key={id} className="flex justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded"
                        style={{ background: cat.color }}
                      />
                      {cat.label}
                    </span>
                    <span>{formatDuration(mins)}</span>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Templates</h3>
        <button
          onClick={onSaveAsTemplate}
          className="text-xs w-full text-left bg-zinc-800 hover:bg-zinc-700 px-2 py-1.5 rounded-md"
          disabled={blocks.length === 0}
        >
          ＋ Save current day as template
        </button>
        {templates?.daily?.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Apply to today</div>
            {templates.daily.map((t) => (
              <button
                key={t.id}
                onClick={() => onApplyTemplate(t)}
                className="w-full text-left bg-zinc-800/60 hover:bg-zinc-700 px-2 py-1.5 rounded-md text-xs"
              >
                {t.name}{" "}
                <span className="text-zinc-500">({t.blocks.length} blocks)</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
