import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Select,
  Label,
} from "@/components/ui";

export function BlockEditor({ open, onClose, block, onSave, onDelete, categories }) {
  const [draft, setDraft] = useState(block || null);

  useEffect(() => {
    setDraft(block);
  }, [block]);

  if (!open || !draft) return null;

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const invalidEnd = draft.end <= draft.start;

  const save = (e) => {
    e?.preventDefault?.();
    if (!draft.start || !draft.end || invalidEnd) return;
    onSave(draft);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={save}>
        <DialogHeader>
          <DialogTitle>{block.id ? "Edit block" : "New block"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              type="text"
              value={draft.title || ""}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="e.g., CARS practice passages"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input
                type="time"
                value={draft.start}
                onChange={(e) => update({ start: e.target.value })}
              />
            </div>
            <div>
              <Label>End</Label>
              <Input
                type="time"
                value={draft.end}
                onChange={(e) => update({ end: e.target.value })}
                invalid={invalidEnd}
              />
              {invalidEnd && (
                <div className="mt-1 text-[12px] text-danger">
                  End must be after start.
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <Select
              value={draft.category}
              onChange={(e) => update({ category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={draft.notes || ""}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Resources, goals, etc."
            />
          </div>
        </div>

        <DialogFooter className="justify-between">
          {block.id ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onDelete(block.id)}
              className="text-danger hover:text-danger hover:bg-[color:var(--danger-soft)]"
            >
              <Trash2 size={14} /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={invalidEnd}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
