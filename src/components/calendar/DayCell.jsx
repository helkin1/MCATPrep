import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { dayKey } from "@/lib/time";
import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

/**
 * Convert a hex color to an `rgb(r g b / alpha)` string.
 * Used so block chips render as soft tinted fills rather than saturated solids.
 */
function tint(hex, alpha) {
  const c = (hex || "#888").replace("#", "");
  if (c.length !== 6) return `rgba(136,136,136,${alpha})`;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function DayCell({ date, inMonth, isToday, isExamDay, dayData, categories, onMoveBlock }) {
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const blocks = dayData?.blocks || [];
  const myKey = dayKey(date);

  // Pick the top 3 most MCAT-relevant blocks by category priority, then
  // display those 3 in chronological order so the cell still reads
  // top-to-bottom. Priority is defined on the category — see
  // lib/categories.js.
  const byPriority = [...blocks].sort((a, b) => {
    const ap = categories.find((c) => c.id === a.category)?.priority ?? 100;
    const bp = categories.find((c) => c.id === b.category)?.priority ?? 100;
    if (ap !== bp) return ap - bp;
    return a.start.localeCompare(b.start);
  });
  const top = byPriority.slice(0, 3);
  const visible = top.sort((a, b) => a.start.localeCompare(b.start));
  const more = blocks.length - visible.length;

  const onCellClick = (e) => {
    if (e.defaultPrevented) return;
    navigate(`/day/${myKey}`);
  };

  const onDragStart = (e, blockId) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-mcat-block", JSON.stringify({
      sourceDate: myKey,
      blockId,
    }));
  };

  const onDragOver = (e) => {
    if (e.dataTransfer.types.includes("application/x-mcat-block")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!dragOver) setDragOver(true);
    }
  };

  const onDragLeave = () => setDragOver(false);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const raw = e.dataTransfer.getData("application/x-mcat-block");
    if (!raw) return;
    try {
      const { sourceDate, blockId } = JSON.parse(raw);
      if (sourceDate && blockId && sourceDate !== myKey) {
        onMoveBlock?.(sourceDate, myKey, blockId);
      }
    } catch {}
  };

  return (
    <div
      onClick={onCellClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "group relative min-h-[112px] rounded-lg flex flex-col items-stretch text-left p-2.5 gap-1.5 cursor-pointer",
        "bg-surface-1 border border-border shadow-sm",
        "transition-[transform,background,box-shadow,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
        "hover:bg-surface-2 hover:-translate-y-px hover:shadow-md hover:border-border-strong",
        !inMonth && "opacity-40",
        isToday && "bg-accent-soft border-[color:var(--accent)]/40",
        isExamDay && "border-danger/50 bg-[color:var(--danger-soft)]",
        dragOver && "ring-2 ring-accent border-accent bg-surface-2"
      )}
    >
      {/* Day number row */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "tabular text-[12px] font-medium leading-none",
            isToday ? "text-accent font-semibold" : "text-text-2"
          )}
        >
          {date.getDate()}
        </span>
        {isToday && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
        )}
        {isExamDay && (
          <span className="text-[9px] uppercase tracking-[0.08em] text-danger font-semibold">
            Exam
          </span>
        )}
      </div>

      {/* Block chips — soft tinted fill + 2px accent left bar */}
      <div className="flex flex-col gap-1 overflow-hidden">
        {visible.map((b) => {
          const cat = getCategory(categories, b.category);
          return (
            <div
              key={b.id}
              draggable
              onDragStart={(e) => onDragStart(e, b.id)}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/day/${myKey}`);
              }}
              title="Drag to move · click to open"
              className="text-[11px] pl-1.5 pr-1.5 py-[3px] rounded-[4px] truncate font-medium cursor-grab active:cursor-grabbing border-l-2"
              style={{
                background: tint(cat.color, 0.16),
                borderLeftColor: cat.color,
                color: "var(--text-1)",
              }}
            >
              {b.title || cat.label}
            </div>
          );
        })}
        {more > 0 && (
          <div className="text-[10px] text-text-3 px-1">+{more} more</div>
        )}
      </div>
    </div>
  );
}
