import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
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

function tint(hex, alpha) {
  const c = (hex || "#888").replace("#", "");
  if (c.length !== 6) return `rgba(136,136,136,${alpha})`;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function CategoriesPanel({ profile, updateProfile }) {
  const custom = profile?.settings?.categories || [];
  const [editing, setEditing] = useState(null);
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const merged = useMemo(() => resolveCategories(custom), [custom]);

  const persist = async (next) => {
    const settings = { ...(profile.settings || {}), categories: next };
    await updateProfile({ settings });
  };

  const upsert = async (cat) => {
    const next = [...custom];
    const idx = next.findIndex((c) => c.id === cat.id);
    if (idx >= 0) next[idx] = cat;
    else next.push(cat);
    await persist(next);
    setEditing(null);
    toast({ variant: "success", title: "Category saved" });
  };

  const remove = async (id) => {
    const ok = await confirm({
      title: "Delete this category?",
      description:
        "Blocks using it will keep their data but display as default.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await persist(custom.filter((c) => c.id !== id));
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
    const overridden = custom.find((c) => c.id === id);
    setEditing({ ...original, ...overridden, builtin: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-2">
          Customize built-in category colors or add your own.
        </p>
        <Button size="sm" onClick={addNew}>
          <Plus size={14} /> New category
        </Button>
      </div>

      <div className="space-y-1.5">
        {merged.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 bg-surface-1 border border-border hover:border-border-strong rounded-lg px-3 py-2.5 transition-colors group"
          >
            <div
              className="w-8 h-8 rounded-md flex-shrink-0 border-l-[3px] flex items-center justify-center"
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
        ))}
      </div>

      <Dialog open={!!editing} onClose={() => setEditing(null)} size="md">
        {editing && (
          <>
            <DialogHeader>
              <DialogTitle>
                {editing.builtin
                  ? "Override built-in category"
                  : custom.some((c) => c.id === editing.id)
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
