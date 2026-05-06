import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { dayKey, addDays, parseDayKey, uid } from "@/lib/time";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Lists daily and weekly templates. Lets user delete them or apply a daily
 * template to a date, or a weekly template to a date range.
 */
export function TemplatesPanel({ templates, persistTemplates, days, bulkReplaceDays }) {
  const [applying, setApplying] = useState(null); // { kind: "daily"|"weekly", template }

  const remove = async (kind, id) => {
    if (!confirm("Delete this template?")) return;
    await persistTemplates({
      ...templates,
      [kind]: (templates[kind] || []).filter((t) => t.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold mb-2">Daily templates</h3>
        <p className="text-xs text-zinc-400 mb-3">
          Save a day's blocks as a template you can re-apply to any other day. Save them from the day view.
        </p>
        {(templates.daily || []).length === 0 && (
          <div className="text-sm text-zinc-500">No daily templates yet.</div>
        )}
        <div className="space-y-1">
          {(templates.daily || []).map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-zinc-500">{t.blocks.length} blocks</div>
              </div>
              <button
                onClick={() => setApplying({ kind: "daily", template: t })}
                className="text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-md"
              >
                Apply
              </button>
              <button
                onClick={() => remove("daily", t.id)}
                className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">Weekly templates</h3>
        <p className="text-xs text-zinc-400 mb-3">
          Save a 7-day block of your week and stamp it onto any future week.
        </p>
        <button
          onClick={() => {
            const name = window.prompt("Template name", "Standard week");
            if (!name) return;
            // Capture the most recent 7 days from today backward (or empty)
            const today = new Date();
            const weekBlocks = []; // [{ dayIndex (0-6 Sun-Sat), blocks: [...] }, ...]
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
            persistTemplates({
              ...templates,
              weekly: [
                ...(templates.weekly || []),
                { id: uid(), name, days: weekBlocks },
              ],
            });
          }}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-md mb-3"
        >
          ＋ Save next 7 days as weekly template
        </button>
        {(templates.weekly || []).length === 0 && (
          <div className="text-sm text-zinc-500">No weekly templates yet.</div>
        )}
        <div className="space-y-1">
          {(templates.weekly || []).map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-zinc-500">
                  {t.days.length} day(s):{" "}
                  {t.days.map((d) => WEEKDAYS[d.dayIndex]).join(", ")}
                </div>
              </div>
              <button
                onClick={() => setApplying({ kind: "weekly", template: t })}
                className="text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-md"
              >
                Apply
              </button>
              <button
                onClick={() => remove("weekly", t.id)}
                className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <ApplyModal
        applying={applying}
        onClose={() => setApplying(null)}
        days={days}
        bulkReplaceDays={bulkReplaceDays}
      />
    </div>
  );
}

function ApplyModal({ applying, onClose, days, bulkReplaceDays }) {
  const [from, setFrom] = useState(dayKey(new Date()));
  const [to, setTo] = useState(dayKey(addDays(new Date(), 6)));
  const [mode, setMode] = useState("merge"); // merge | replace

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
        blocks: mode === "replace" ? newBlocks : [...day.blocks, ...newBlocks].sort((a, b) => a.start.localeCompare(b.start)),
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
          blocks: mode === "replace" ? newBlocks : [...day.blocks, ...newBlocks].sort((a, b) => a.start.localeCompare(b.start)),
        };
      }
    }
    bulkReplaceDays(next);
    onClose();
  };

  return (
    <Modal open onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Apply "{template.name}"</h2>

        {kind === "daily" ? (
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Apply to date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-zinc-400 mb-1">If blocks already exist</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm"
          >
            <option value="merge">Merge (add to existing)</option>
            <option value="replace">Replace (overwrite the day)</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={apply}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-md text-sm"
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
}
