import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, GripVertical } from "lucide-react";
import { ColorPicker } from "@/components/common/ColorPicker";
import {
  Button,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  useConfirm,
  useToast,
} from "@/components/ui";
import { DEFAULT_CATEGORIES, resolveCategories } from "@/lib/categories";
import { uid } from "@/lib/time";
import { cn } from "@/lib/utils";

function tint(hex, alpha) {
  const c = (hex || "#888").replace("#", "");
  if (c.length !== 6) return `rgba(136,136,136,${alpha})`;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function CategoriesPanel({ profile, updateProfile }) {
  const stored = profile?.settings?.categories || [];
  const [editing, setEditing] = useState(null);
  const { confirm } = useConfirm();
  const { toast } = useToast();

  // resolveCategories returns the user's ordered list with builtins
  // appended; `merged` is what we render. When the user reorders we save
  // the full merged list back so the order sticks.
  const merged = useMemo(() => resolveCategories(stored), [stored]);

  // Persist a full ordered list. Strip the synthetic `priority` field —
  // resolveCategories recomputes it on read from position.
  const persist = async (next) => {
    const clean = next.map(({ priority, ...rest }) => rest);
    const settings = { ...(profile.settings || {}), categories: clean };
    await updateProfile({ settings });
  };

  const upsert = async (cat) => {
    const next = [...merged];
    const idx = next.findIndex((c) => c.id === cat.id);
    if (idx >= 0) next[idx] = { ...next[idx], ...cat };
    else next.push(cat);
    await persist(next);
    setEditing(null);
    toast({ variant: "success", title: "Category saved" });
  };

  const remove = async (id) => {
    const target = merged.find((c) => c.id === id);
    if (target?.builtin) return; // built-ins aren't deletable
    const ok = await confirm({
      title: "Delete this category?",
      description:
        "Blocks using it will keep their data but display as default.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await persist(merged.filter((c) => c.id !== id));
    toast({ variant: "success", title: "Category deleted" });
  };

  const addNew = () => {
    setEditing({
      id: `c_${uid()}`,
      label: "",
      color: "#7c9cff",
      studyish: false,
      builtin: false,
    });
  };

  const editBuiltin = (id) => {
    const original = DEFAULT_CATEGORIES.find((c) => c.id === id);
    const overridden = merged.find((c) => c.id === id);
    setEditing({ ...original, ...overridden, builtin: true });
  };

  // ── Drag-and-drop reordering ────────────────────────────────────
  // Tracks which row is being dragged and which index the cursor is
  // currently over. We don't try to be fancy with offset math — drop
  // before the hovered index, or append when dragging past the end.
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const onDragOverRow = (e, idx) => {
    if (dragId == null) return;
    e.preventDefault();
    setDragOver(idx);
  };
  const onDropRow = async (e, idx) => {
    e.preventDefault();
    if (dragId == null) return;
    const fromIdx = merged.findIndex((c) => c.id === dragId);
    if (fromIdx === -1 || fromIdx === idx) {
      setDragId(null);
      setDragOver(null);
      return;
    }
    const next = [...merged];
    const [moved] = next.splice(fromIdx, 1);
    const insertAt = idx > fromIdx ? idx - 1 : idx;
    next.splice(insertAt, 0, moved);
    setDragId(null);
    setDragOver(null);
    await persist(next);
  };
  const onDragEnd = () => {
    setDragId(null);
    setDragOver(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-2">
          Drag the handle to rank by priority. Top of the list surfaces first
          on dense days.
        </p>
        <Button size="sm" onClick={addNew}>
          <Plus size={14} /> New category
        </Button>
      </div>

      <div
        className="space-y-1.5"
        onDragOver={(e) => {
          // Allow dropping past the last row by hovering empty space.
          if (dragId != null) e.preventDefault();
        }}
        onDrop={(e) => onDropRow(e, merged.length)}
      >
        {merged.map((c, i) => {
          const dragging = dragId === c.id;
          const showDropAbove = dragOver === i && dragId && dragId !== c.id;
          return (
            <div
              key={c.id}
              draggable
              onDragStart={(e) => onDragStart(e, c.id)}
              onDragOver={(e) => onDragOverRow(e, i)}
              onDrop={(e) => onDropRow(e, i)}
              onDragEnd={onDragEnd}
              className={cn(
                "relative flex items-center gap-3 bg-surface-1 border border-border hover:border-border-strong rounded-lg px-2.5 py-2.5 transition-[border-color,opacity,box-shadow] group",
                dragging && "opacity-40",
                showDropAbove && "before:absolute before:left-0 before:right-0 before:-top-1 before:h-0.5 before:bg-accent before:rounded-full"
              )}
            >
              <span
                className="cursor-grab active:cursor-grabbing text-text-3 hover:text-text-1 flex-shrink-0 -ml-0.5"
                aria-label="Drag to reorder"
              >
                <GripVertical size={14} />
              </span>
              <span className="font-mono tabular text-[11px] text-text-3 w-5 text-center flex-shrink-0">
                {i + 1}
              </span>
              <div
                className="w-7 h-7 rounded-md flex-shrink-0 border-l-[3px]"
                style={{
                  background: tint(c.color, 0.16),
                  borderLeftColor: c.color,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[13px] text-text-1 truncate">
                  {c.label}
                </div>
                <div className="text-[11px] text-text-3">
                  {c.builtin ? "Built-in" : "Custom"}
                  {c.studyish && " · counts as study time"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (c.builtin ? editBuiltin(c.id) : setEditing({ ...c }))}
                aria-label="Edit category"
              >
                <Pencil size={14} />
              </Button>
              {!c.builtin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(c.id)}
                  aria-label="Delete category"
                  className="hover:text-danger"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onClose={() => setEditing(null)} size="md">
        {editing && (
          <>
            <DialogHeader>
              <DialogTitle>
                {editing.builtin
                  ? "Override built-in category"
                  : merged.some((c) => c.id === editing.id)
                  ? "Edit category"
                  : "New category"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Label</Label>
                <Input
                  type="text"
                  value={editing.label}
                  onChange={(e) =>
                    setEditing({ ...editing, label: e.target.value })
                  }
                  disabled={editing.builtin}
                  placeholder="e.g., Anki review"
                />
              </div>

              <div>
                <Label>Color</Label>
                <ColorPicker
                  value={editing.color}
                  onChange={(c) => setEditing({ ...editing, color: c })}
                />
              </div>

              {!editing.builtin && (
                <label className="flex items-center gap-2.5 cursor-pointer text-[13px] text-text-1">
                  <span className="relative inline-flex">
                    <input
                      type="checkbox"
                      checked={!!editing.studyish}
                      onChange={(e) =>
                        setEditing({ ...editing, studyish: e.target.checked })
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
                  Counts as MCAT study time
                </label>
              )}

              <div
                className="rounded-md px-3 py-2 text-[13px] font-medium border-l-[3px]"
                style={{
                  background: tint(editing.color, 0.16),
                  borderLeftColor: editing.color,
                  color: "var(--text-1)",
                }}
              >
                Preview: {editing.label || "Untitled"}
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => upsert(editing)}
                disabled={!editing.label.trim()}
              >
                Save
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}
