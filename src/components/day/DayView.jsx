import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowLeft, Plus } from "lucide-react";
import { ScheduleGrid } from "./ScheduleGrid";
import { Sidebar } from "./Sidebar";
import { BlockEditor } from "./BlockEditor";
import { addDays, dayKey, parseDayKey, todayKey, uid, timeToMinutes, minutesToTime } from "@/lib/time";
import { resolveCategories } from "@/lib/categories";
import { Button, useConfirm, useToast } from "@/components/ui";

// When a new "questions" block is saved, drop a proportional review block
// right after it. Ratio 1.5× sits in the middle of the 1.2–1.8 range the
// user requested; review duration is clamped so it doesn't run past 23:59.
const REVIEW_RATIO = 1.5;

function reviewFor(block) {
  const startMin = timeToMinutes(block.start);
  const endMin = timeToMinutes(block.end);
  const len = Math.max(15, endMin - startMin);
  const reviewLen = Math.round(len * REVIEW_RATIO);
  const reviewStart = endMin;
  const reviewEnd = Math.min(24 * 60 - 1, reviewStart + reviewLen);
  if (reviewEnd <= reviewStart) return null;
  return {
    title: `Review — ${block.title || "questions"}`,
    start: minutesToTime(reviewStart),
    end: minutesToTime(reviewEnd),
    category: "review",
    notes: "Auto-paired with practice questions.",
  };
}

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

  const [editing, setEditing] = useState(null);
  const { confirm, prompt } = useConfirm();
  const { toast } = useToast();

  const dateObj = parseDayKey(key);
  const weekday = dateObj.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = dateObj.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  const year = dateObj.getFullYear();
  const isToday = key === todayKey();

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
    const isNew = !draft.id;
    const saved = { ...draft, id: draft.id || uid() };
    upsertBlock(key, saved);

    // Auto-pair a review block for new "questions" entries.
    if (isNew && saved.category === "questions") {
      const review = reviewFor(saved);
      if (review) {
        upsertBlock(key, { ...review, id: uid() });
        toast({
          variant: "success",
          title: "Added review block",
          description: `${review.start}–${review.end} paired with questions.`,
        });
      }
    }

    setEditing(null);
  };

  const remove = (id) => {
    deleteBlock(key, id);
    setEditing(null);
  };

  const saveAsTemplate = async () => {
    const name = await prompt({
      title: "Save as template",
      description: "Re-apply these blocks to any other day later.",
      label: "Template name",
      defaultValue: `${weekday} blocks`,
      placeholder: "e.g., Heavy CARS day",
    });
    if (!name) return;
    const tpl = {
      id: uid(),
      name,
      blocks: blocks.map(({ id, ...rest }) => rest),
    };
    persistTemplates({ ...templates, daily: [...(templates.daily || []), tpl] });
    toast({ variant: "success", title: "Template saved" });
  };

  const applyTemplate = async (tpl) => {
    const ok = await confirm({
      title: `Apply "${tpl.name}"?`,
      description: `Adds ${tpl.blocks.length} blocks to ${monthDay}.`,
      confirmLabel: "Apply",
    });
    if (!ok) return;
    for (const b of tpl.blocks) {
      upsertBlock(key, { ...b, id: uid() });
    }
    toast({ variant: "success", title: "Template applied" });
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface-1/60 backdrop-blur-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="-ml-2"
        >
          <ArrowLeft size={14} /> Month
        </Button>

        <div className="h-5 w-px bg-border-strong mx-1" />

        {/* Date stepper — segmented look */}
        <div className="inline-flex items-center bg-surface-2 border border-border rounded-md overflow-hidden">
          <button
            onClick={() => navDay(-1)}
            aria-label="Previous day"
            className="h-8 w-8 inline-flex items-center justify-center text-text-2 hover:text-text-1 hover:bg-surface-3 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => navigate(`/day/${todayKey()}`)}
            className="h-8 px-3 text-[12px] font-medium text-text-2 hover:text-text-1 hover:bg-surface-3 border-x border-border transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navDay(1)}
            aria-label="Next day"
            className="h-8 w-8 inline-flex items-center justify-center text-text-2 hover:text-text-1 hover:bg-surface-3 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Title block */}
        <div className="ml-2">
          <div className="font-display text-[20px] font-semibold tracking-tight text-text-1 leading-none">
            {weekday}
          </div>
          <div className="text-[12px] text-text-3 tabular mt-0.5">
            {monthDay}, {year}
            {isToday && (
              <span className="ml-2 inline-flex items-center gap-1 text-accent">
                <span className="w-1 h-1 rounded-full bg-accent" /> Today
              </span>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {key === examDate && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[color:var(--danger-soft)] text-danger text-[11px] uppercase tracking-[0.06em] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              Exam day
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => onCreate({ start: "09:00", end: "10:00" })}
          >
            <Plus size={14} /> New block
          </Button>
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
