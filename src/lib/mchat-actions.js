import { uid } from "@/lib/time";

/**
 * Executes a single approved M-Chat tool call against the local data layer.
 * `mutators` is the bag passed by MChatProvider — { upsertBlock, deleteBlock,
 * moveBlock, setDayTodos, days, updateProfile, applyTemplate, templates }.
 *
 * Returns a short string describing the outcome — used for the chat log so the
 * user can see what was applied without scrolling around.
 */
export async function executeAction(call, mutators) {
  const { name, input } = call;
  switch (name) {
    case "create_block": {
      const id = uid();
      mutators.upsertBlock(input.date, {
        id,
        title: input.title || "",
        start: input.start,
        end: input.end,
        category: input.category,
        notes: input.notes || "",
      });
      return `Added "${input.title || input.category}" on ${input.date}.`;
    }

    case "update_block": {
      const day = mutators.days[input.date];
      const existing = day?.blocks?.find((b) => b.id === input.blockId);
      if (!existing) return `Could not find block ${input.blockId} on ${input.date}.`;
      const patch = { ...existing };
      for (const k of ["start", "end", "title", "category", "notes"]) {
        if (input[k] !== undefined) patch[k] = input[k];
      }
      mutators.upsertBlock(input.date, patch);
      return `Updated "${patch.title}" on ${input.date}.`;
    }

    case "delete_block": {
      mutators.deleteBlock(input.date, input.blockId);
      return `Deleted block on ${input.date}.`;
    }

    case "move_block": {
      mutators.moveBlock(input.fromDate, input.toDate, input.blockId);
      return `Moved block ${input.fromDate} → ${input.toDate}.`;
    }

    case "add_todo": {
      const day = mutators.days[input.date] || { blocks: [], todos: [] };
      const todos = [...(day.todos || []), { id: uid(), text: input.text, done: false }];
      mutators.setDayTodos(input.date, todos);
      return `Added to-do on ${input.date}: "${input.text}".`;
    }

    case "complete_todo": {
      const day = mutators.days[input.date];
      if (!day) return `No day data for ${input.date}.`;
      const todos = (day.todos || []).map((t) =>
        t.id === input.todoId ? { ...t, done: !!input.done } : t
      );
      mutators.setDayTodos(input.date, todos);
      return `Marked todo ${input.done ? "done" : "open"} on ${input.date}.`;
    }

    case "delete_todo": {
      const day = mutators.days[input.date];
      if (!day) return `No day data for ${input.date}.`;
      const todos = (day.todos || []).filter((t) => t.id !== input.todoId);
      mutators.setDayTodos(input.date, todos);
      return `Deleted todo on ${input.date}.`;
    }

    case "apply_template": {
      const list = mutators.templates?.[input.kind] || [];
      const tpl = list.find((t) => t.id === input.templateId);
      if (!tpl) return `Template ${input.templateId} not found.`;
      const mode = input.mode || "merge";
      for (const date of input.dates || []) {
        const day = mutators.days[date] || { blocks: [], todos: [] };
        let newBlocks = [];
        if (input.kind === "daily") {
          newBlocks = tpl.blocks.map((b) => ({ ...b, id: uid() }));
        } else {
          const wantedIdx = new Date(date + "T00:00").getDay();
          const match = tpl.days.find((d) => d.dayIndex === wantedIdx);
          if (!match) continue;
          newBlocks = match.blocks.map((b) => ({ ...b, id: uid() }));
        }
        const blocks =
          mode === "replace"
            ? newBlocks
            : [...day.blocks, ...newBlocks].sort((a, b) => a.start.localeCompare(b.start));
        // upsertBlock works one-at-a-time; for batch we replace via setDayBlocks-equivalent
        // path. Easiest is to iterate upsertBlock — but that doesn't replace existing on
        // "replace" mode. Use replaceDay-style: emulate by deleting all then inserting.
        if (mode === "replace") {
          for (const b of day.blocks || []) mutators.deleteBlock(date, b.id);
        }
        for (const b of newBlocks) mutators.upsertBlock(date, b);
      }
      return `Applied "${tpl.name}" to ${input.dates?.length || 0} day(s).`;
    }

    case "update_exam_date": {
      await mutators.updateProfile({ exam_date: input.examDate || null });
      return `Exam date set to ${input.examDate}.`;
    }

    case "set_memory": {
      const settings = { ...(mutators.profile?.settings || {}), memory: input.memory || "" };
      await mutators.updateProfile({ settings });
      return `Saved memory (${(input.memory || "").length} chars).`;
    }

    default:
      return `Unknown action: ${name}`;
  }
}

/**
 * Human-readable description of a proposed change, used as the title in the
 * approval card. Kept short — we render the full input object below it.
 */
export function summarizeAction(call) {
  const { name, input } = call;
  switch (name) {
    case "create_block":
      return `Add "${input.title || input.category}" — ${input.date} ${input.start}–${input.end}`;
    case "update_block":
      return `Update block on ${input.date}`;
    case "delete_block":
      return `Delete block on ${input.date}`;
    case "move_block":
      return `Move block ${input.fromDate} → ${input.toDate}`;
    case "add_todo":
      return `Add to-do on ${input.date}: "${input.text}"`;
    case "complete_todo":
      return `Mark to-do ${input.done ? "done" : "open"} on ${input.date}`;
    case "delete_todo":
      return `Delete to-do on ${input.date}`;
    case "apply_template":
      return `Apply template to ${input.dates?.length || 0} day(s)`;
    case "update_exam_date":
      return `Set exam date to ${input.examDate}`;
    case "set_memory":
      return `Update persistent memory`;
    default:
      return name;
  }
}
