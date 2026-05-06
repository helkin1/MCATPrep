import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TemplatesPanel({ templates, persistTemplates, days, bulkReplaceDays }) {
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

function ApplyDialog({ applying, onClose, days, bulkReplaceDays }) {
  const [from, setFrom] = useState(dayKey(new Date()));
  const [to, setTo] = useState(dayKey(addDays(new Date(), 6)));
  const [mode, setMode] = useState("merge");
  const { toast } = useToast();

  if (!applying) return null;
  const { kind, template } = applying;

  const apply = () => {
    const next = { ...days };
    if (kind === "daily") {
      const key = from;
      const day = next[key] || { blocks: [], todos: [] };
      const newBlocks = template.blocks.map((b) => ({ ...b, id: uid() }));
      next[key] = {
        ...day,
        blocks:
          mode === "replace"
            ? newBlocks
            : [...day.blocks, ...newBlocks].sort((a, b) =>
                a.start.localeCompare(b.start)
              ),
      };
    } else if (kind === "weekly") {
      const start = parseDayKey(from);
      const end = parseDayKey(to);
      const dayCount = Math.round((end - start) / 86400000);
      for (let i = 0; i <= dayCount; i++) {
        const d = addDays(start, i);
        const key = dayKey(d);
        const wantedDayIndex = d.getDay();
        const match = template.days.find((dd) => dd.dayIndex === wantedDayIndex);
        if (!match) continue;
        const day = next[key] || { blocks: [], todos: [] };
        const newBlocks = match.blocks.map((b) => ({ ...b, id: uid() }));
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
    }
    bulkReplaceDays(next);
    toast({ variant: "success", title: "Template applied" });
    onClose();
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Apply "{template.name}"</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {kind === "daily" ? (
          <div>
            <Label>Apply to date</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
        ) : (
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

        <div>
          <Label>If blocks already exist</Label>
          <Select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="merge">Merge (add to existing)</option>
            <option value="replace">Replace (overwrite the day)</option>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={apply}>Apply</Button>
      </DialogFooter>
    </Dialog>
  );
}
