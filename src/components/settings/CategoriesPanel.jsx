import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { ColorPicker } from "@/components/common/ColorPicker";
import { Modal } from "@/components/common/Modal";
import { DEFAULT_CATEGORIES, resolveCategories, textOn } from "@/lib/categories";
import { uid } from "@/lib/time";

export function CategoriesPanel({ profile, updateProfile }) {
  const custom = profile?.settings?.categories || [];
  const [editing, setEditing] = useState(null);

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
  };

  const remove = async (id) => {
    if (!confirm("Delete this category? Blocks using it will keep their data but display as default.")) return;
    await persist(custom.filter((c) => c.id !== id));
  };

  const addNew = () => {
    setEditing({
      id: `c_${uid()}`,
      label: "",
      color: "#3b82f6",
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          Customize built-in category colors or add your own.
        </p>
        <button
          onClick={addNew}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-md flex items-center gap-1"
        >
          <Plus size={14} /> New category
        </button>
      </div>

      <div className="space-y-1">
        {merged.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2"
          >
            <div
              className="w-8 h-8 rounded-md flex-shrink-0"
              style={{ background: c.color }}
            />
            <div className="flex-1">
              <div className="font-medium text-sm" style={{ color: c.color }}>
                {c.label}
              </div>
              <div className="text-xs text-zinc-500">
                {c.builtin ? "Built-in" : "Custom"}
                {c.studyish && " · counts as study time"}
              </div>
            </div>
            <button
              onClick={() => (c.builtin ? editBuiltin(c.id) : setEditing({ ...c }))}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100"
            >
              <Pencil size={14} />
            </button>
            {!c.builtin && (
              <button
                onClick={() => remove(c.id)}
                className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">
              {custom.some((c) => c.id === editing.id) || !editing.builtin
                ? "Edit category"
                : "Override built-in category"}
            </h2>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Label</label>
              <input
                type="text"
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                disabled={editing.builtin}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-2">Color</label>
              <ColorPicker
                value={editing.color}
                onChange={(c) => setEditing({ ...editing, color: c })}
              />
            </div>

            {!editing.builtin && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editing.studyish}
                  onChange={(e) => setEditing({ ...editing, studyish: e.target.checked })}
                />
                Counts as MCAT study time
              </label>
            )}

            <div
              className="rounded-md px-3 py-2 text-sm font-medium"
              style={{ background: editing.color, color: textOn(editing.color) }}
            >
              Preview: {editing.label || "Untitled"}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-md text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => upsert(editing)}
                disabled={!editing.label.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md text-sm"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
