import { useEffect, useMemo, useState } from "react";
import { Trash2, Plus, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SectionLabel,
  useConfirm,
  useToast,
} from "@/components/ui";
import { dayKey, addDays, parseDayKey, uid } from "@/lib/time";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TemplatesPanel({ templates, persistTemplates, days, bulkReplaceDays, examDate }) {
  const [applying, setApplying] = useState(null);
  const { confirm, prompt } = useConfirm();
  const { toast } = useToast();

  const remove = async (kind, id) => {
    const ok = await confirm({
      title: "Delete this template?",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await persistTemplates({
      ...templates,
      [kind]: (templates[kind] || []).filter((t) => t.id !== id),
    });
    toast({ variant: "success", title: "Template deleted" });
  };

  const saveWeekly = async () => {
    const name = await prompt({
      title: "Save weekly template",
      description: "Captures the next 7 days from today.",
      label: "Template name",
      defaultValue: "Standard week",
      placeholder: "e.g., Pre-test push",
    });
    if (!name) return;
    const today = new Date();
    const weekBlocks = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, i);
      const key = dayKey(d);
      const dayObj = days[key];
      if (dayObj?.blocks?.length) {
        weekBlocks.push({
          dayIndex: d.getDay(),
          blocks: dayObj.blocks.map(({ id, ...rest }) => rest),
        });
      }
    }
    await persistTemplates({
      ...templates,
      weekly: [
        ...(templates.weekly || []),
        { id: uid(), name, days: weekBlocks },
      ],
    });
    toast({
      variant: "success",
      title: "Weekly template saved",
      description: `${weekBlocks.length} day(s) captured`,
    });
  };

  return (
    <div className="space-y-8">
      <section>
        <SectionLabel>Daily templates</SectionLabel>
        <p className="text-[12px] text-text-3 mb-3">
          Save a day's blocks as a template you can re-apply to any other day.
          Save them from the day view.
        </p>
        {(templates.daily || []).length === 0 && (
          <div className="text-[13px] text-text-3 bg-surface-1 border border-border rounded-lg px-4 py-3">
            No daily templates yet.
          </div>
        )}
        <div className="space-y-1.5">
          {(templates.daily || []).map((t) => (
            <TemplateRow
              key={t.id}
              name={t.name}
              meta={`${t.blocks.length} blocks`}
              onApply={() => setApplying({ kind: "daily", template: t })}
              onDelete={() => remove("daily", t.id)}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Weekly templates</SectionLabel>
        <p className="text-[12px] text-text-3 mb-3">
          Save a 7-day block of your week and stamp it onto any future week.
        </p>
        <Button variant="outline" size="sm" onClick={saveWeekly} className="mb-3">
          <Plus size={13} /> Save next 7 days as weekly template
        </Button>
        {(templates.weekly || []).length === 0 && (
          <div className="text-[13px] text-text-3 bg-surface-1 border border-border rounded-lg px-4 py-3">
            No weekly templates yet.
          </div>
        )}
        <div className="space-y-1.5">
          {(templates.weekly || []).map((t) => (
            <TemplateRow
              key={t.id}
              name={t.name}
              meta={`${t.days.length} day(s) · ${t.days
                .map((d) => WEEKDAYS[d.dayIndex])
                .join(", ")}`}
              onApply={() => setApplying({ kind: "weekly", template: t })}
              onDelete={() => remove("weekly", t.id)}
            />
          ))}
        </div>
      </section>

      <ApplyDialog
        applying={applying}
        onClose={() => setApplying(null)}
        days={days}
        bulkReplaceDays={bulkReplaceDays}
        examDate={examDate}
      />
    </div>
  );
}

function TemplateRow({ name, meta, onApply, onDelete }) {
  return (
    <div className="flex items-center gap-3 bg-surface-1 border border-border hover:border-border-strong rounded-lg px-3 py-2.5 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[13px] text-text-1 truncate">{name}</div>
        <div className="text-[11px] text-text-3 truncate">{meta}</div>
      </div>
      <Button variant="secondary" size="sm" onClick={onApply}>
        Apply
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        aria-label="Delete template"
        className="hover:text-danger"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}

/**
 * Apply dialog with four recurrence modes:
 *   single   — one date (daily only)
 *   weekday  — every [weekday] from–to (daily only)
 *   specific — multi-select discrete dates (both kinds)
 *   range    — every day in a from–to span (weekly only — matches existing behavior)
 */
function ApplyDialog({ applying, onClose, days, bulkReplaceDays, examDate }) {
  const today = useMemo(() => dayKey(new Date()), []);
  const examFallback = examDate || dayKey(addDays(new Date(), 28));

  const [recurrence, setRecurrence] = useState(null); // set when applying opens
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(examFallback);
  const [weekday, setWeekday] = useState(new Date().getDay());
  const [picked, setPicked] = useState([]); // ["YYYY-MM-DD", ...]
  const [pickDate, setPickDate] = useState(today);
  const [mode, setMode] = useState("merge");
  const { toast } = useToast();

  // Reset state whenever a new template opens.
  const openKey = applying ? `${applying.kind}:${applying.template?.id}` : null;
  useEffect(() => {
    if (!openKey) return;
    setRecurrence(applying.kind === "daily" ? "single" : "range");
    setFrom(today);
    setTo(examFallback);
    setPicked([]);
    setPickDate(today);
    setWeekday(new Date().getDay());
    setMode("merge");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  if (!applying) return null;
  const { kind, template } = applying;

  // Compute the list of target dates based on the chosen recurrence.
  const targetDates = (() => {
    if (recurrence === "single") return [from];
    if (recurrence === "specific") return [...picked].sort();
    if (recurrence === "weekday" || recurrence === "range") {
      const start = parseDayKey(from);
      const end = parseDayKey(to);
      const out = [];
      const ms = end - start;
      const n = Math.round(ms / 86400000);
      if (n < 0) return [];
      for (let i = 0; i <= n; i++) {
        const d = addDays(start, i);
        if (recurrence === "weekday" && d.getDay() !== weekday) continue;
        out.push(dayKey(d));
      }
      return out;
    }
    return [];
  })();

  const addPickedDate = () => {
    if (!pickDate) return;
    setPicked((p) => (p.includes(pickDate) ? p : [...p, pickDate]));
  };
  const removePicked = (d) => setPicked((p) => p.filter((x) => x !== d));

  const apply = () => {
    if (targetDates.length === 0) {
      toast({ variant: "error", title: "No target dates selected" });
      return;
    }
    const next = { ...days };

    for (const key of targetDates) {
      let newBlocks = [];
      if (kind === "daily") {
        newBlocks = template.blocks.map((b) => ({ ...b, id: uid() }));
      } else {
        const d = parseDayKey(key);
        const match = template.days.find((dd) => dd.dayIndex === d.getDay());
        if (!match) continue;
        newBlocks = match.blocks.map((b) => ({ ...b, id: uid() }));
      }
      const day = next[key] || { blocks: [], todos: [] };
      next[key] = {
        ...day,
        blocks:
          mode === "replace"
            ? newBlocks
            : [...day.blocks, ...newBlocks].sort((a, b) =>
                a.start.localeCompare(b.start)
              ),
      };
    }

    bulkReplaceDays(next);
    toast({
      variant: "success",
      title: "Template applied",
      description: `${targetDates.length} day(s) updated`,
    });
    onClose();
  };

  const recurrenceOptions =
    kind === "daily"
      ? [
          { value: "single", label: "One date" },
          { value: "weekday", label: "Every [weekday] in range" },
          { value: "specific", label: "Specific dates" },
        ]
      : [
          { value: "range", label: "Date range" },
          { value: "specific", label: "Specific dates" },
        ];

  return (
    <Dialog open onClose={onClose} size="md">
      <DialogHeader>
        <DialogTitle>Apply "{template.name}"</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label>Recurrence</Label>
          <Select
            value={recurrence || recurrenceOptions[0].value}
            onChange={(e) => setRecurrence(e.target.value)}
          >
            {recurrenceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        {recurrence === "single" && (
          <div>
            <Label>Apply to date</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
        )}

        {recurrence === "weekday" && (
          <>
            <div>
              <Label>Weekday</Label>
              <Select
                value={weekday}
                onChange={(e) => setWeekday(Number(e.target.value))}
              >
                {WEEKDAYS_LONG.map((w, i) => (
                  <option key={i} value={i}>
                    Every {w}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From</Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <Label>To</Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {recurrence === "range" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        )}

        {recurrence === "specific" && (
          <div>
            <Label>Pick dates</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={pickDate}
                onChange={(e) => setPickDate(e.target.value)}
              />
              <Button variant="secondary" size="md" onClick={addPickedDate}>
                Add
              </Button>
            </div>
            {picked.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...picked].sort().map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 bg-surface-3 text-text-1 rounded-full pl-2.5 pr-1.5 py-1 text-[12px] font-mono tabular"
                  >
                    {d}
                    <button
                      onClick={() => removePicked(d)}
                      className="rounded-full hover:bg-surface-4 text-text-2 hover:text-text-1 transition-colors"
                      aria-label={`Remove ${d}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <Label>If blocks already exist</Label>
          <Select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="merge">Merge (add to existing)</option>
            <option value="replace">Replace (overwrite the day)</option>
          </Select>
        </div>

        <div
          className={cn(
            "text-[12px] rounded-md px-3 py-2 border tabular",
            targetDates.length === 0
              ? "text-text-3 bg-surface-2 border-border"
              : "text-accent bg-accent-soft border-accent/30"
          )}
        >
          {targetDates.length === 0
            ? "No target dates selected yet."
            : `Will apply to ${targetDates.length} day${targetDates.length === 1 ? "" : "s"}.`}
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={apply} disabled={targetDates.length === 0}>
          Apply
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
