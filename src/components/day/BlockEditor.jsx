import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Trash2 } from "lucide-react";

export function BlockEditor({ open, onClose, block, onSave, onDelete, categories }) {
  const [draft, setDraft] = useState(block || null);

  useEffect(() => {
    setDraft(block);
  }, [block]);

  if (!open || !draft) return null;

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const save = (e) => {
    e?.preventDefault?.();
    if (!draft.start || !draft.end) return;
    if (draft.end <= draft.start) return;
    onSave(draft);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <h2 className="text-base font-semibold">{block.id ? "Edit block" : "New block"}</h2>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Title</label>
          <input
            type="text"
            value={draft.title || ""}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g., CARS practice passages"
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Start</label>
            <input
              type="time"
              value={draft.start}
              onChange={(e) => update({ start: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">End</label>
            <input
              type="time"
              value={draft.end}
              onChange={(e) => update({ end: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Category</label>
          <select
            value={draft.category}
            onChange={(e) => update({ category: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Notes</label>
          <textarea
            rows={2}
            value={draft.notes || ""}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Resources, goals, etc."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          {block.id ? (
            <button
              type="button"
              onClick={() => onDelete(block.id)}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:bg-red-900/30 px-2 py-1.5 rounded-md"
            >
              <Trash2 size={14} /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-md text-sm"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
