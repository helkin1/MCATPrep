import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowLeft, Plus } from "lucide-react";
import { ScheduleGrid } from "./ScheduleGrid";
import { Sidebar } from "./Sidebar";
import { BlockEditor } from "./BlockEditor";
import { addDays, dayKey, parseDayKey, todayKey, uid } from "@/lib/time";
import { resolveCategories } from "@/lib/categories";

export function DayView({ days, settings, examDate, upsertBlock, deleteBlock, setDayTodos, templates, persistTemplates }) {
  const navigate = useNavigate();
  const { date } = useParams();
  const key = date || todayKey();
  const day = days[key] || { blocks: [], todos: [] };
  const blocks = day.blocks || [];
  const todos = day.todos || [];

  const categories = useMemo(
    () => resolveCategories(settings?.categories || []),
    [settings]
  );

  const [editing, setEditing] = useState(null); // block being edited, or {} for new

  const dateObj = parseDayKey(key);
  const dateLabel = dateObj.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const navDay = (delta) => {
    const next = addDays(dateObj, delta);
    navigate(`/day/${dayKey(next)}`);
  };

  const onCreate = (range) => {
    setEditing({
      title: "",
      start: range.start,
      end: range.end,
      category: categories[0].id,
      notes: "",
    });
  };

  const onEdit = (blockId) => {
    const b = blocks.find((x) => x.id === blockId);
    if (b) setEditing({ ...b });
  };

  const onUpdate = (blockId, patch) => {
    const b = blocks.find((x) => x.id === blockId);
    if (!b) return;
    upsertBlock(key, { ...b, ...patch });
  };

  const save = (draft) => {
    upsertBlock(key, { ...draft, id: draft.id || uid() });
    setEditing(null);
  };

  const remove = (id) => {
    deleteBlock(key, id);
    setEditing(null);
  };

  const saveAsTemplate = () => {
    const name = window.prompt("Template name", `${dateLabel} blocks`);
    if (!name) return;
    const tpl = {
      id: uid(),
      name,
      blocks: blocks.map(({ id, ...rest }) => rest),
    };
    persistTemplates({ ...templates, daily: [...(templates.daily || []), tpl] });
  };

  const applyTemplate = (tpl) => {
    if (!confirm(`Apply "${tpl.name}" — this will add ${tpl.blocks.length} blocks to ${key}.`)) return;
    for (const b of tpl.blocks) {
      upsertBlock(key, { ...b, id: uid() });
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="flex items-center gap-2 px-5 py-2 border-b border-zinc-800 bg-zinc-900">
        <button
          onClick={() => navigate("/")}
          className="text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded text-sm flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Month
        </button>
        <button onClick={() => navDay(-1)} className="p-1 hover:bg-zinc-800 rounded">
          <ChevronLeft size={16} />
        </button>
        <button onClick={() => navDay(1)} className="p-1 hover:bg-zinc-800 rounded">
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => navigate(`/day/${todayKey()}`)}
          className="text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded text-sm"
        >
          Today
        </button>
        <h2 className="text-base font-semibold ml-3">{dateLabel}</h2>
        <div className="ml-auto flex items-center gap-2">
          {key === examDate && (
            <span className="text-xs uppercase tracking-wide text-red-400 font-semibold">
              Exam day
            </span>
          )}
          <button
            onClick={() => onCreate({ start: "09:00", end: "10:00" })}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-md flex items-center gap-1"
          >
            <Plus size={14} /> New block
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto pl-3 pr-1 py-2">
          <ScheduleGrid
            blocks={blocks}
            categories={categories}
            onCreate={onCreate}
            onUpdate={onUpdate}
            onEdit={onEdit}
          />
        </div>
        <Sidebar
          blocks={blocks}
          todos={todos}
          categories={categories}
          onTodosChange={(t) => setDayTodos(key, t)}
          templates={templates}
          onSaveAsTemplate={saveAsTemplate}
          onApplyTemplate={applyTemplate}
        />
      </div>

      <BlockEditor
        open={!!editing}
        onClose={() => setEditing(null)}
        block={editing}
        onSave={save}
        onDelete={remove}
        categories={categories}
      />
    </div>
  );
}
