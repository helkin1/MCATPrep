import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { dayKey } from "@/lib/time";
import { getCategory, textOn } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function DayCell({ date, inMonth, isToday, isExamDay, dayData, categories, onMoveBlock }) {
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const blocks = dayData?.blocks || [];
  const myKey = dayKey(date);

  const sorted = [...blocks].sort((a, b) => {
    const aS = (categories.find((c) => c.id === a.category)?.studyish ? 0 : 1);
    const bS = (categories.find((c) => c.id === b.category)?.studyish ? 0 : 1);
    if (aS !== bS) return aS - bS;
    return a.start.localeCompare(b.start);
  });
  const visible = sorted.slice(0, 3);
  const more = blocks.length - visible.length;

  const onCellClick = (e) => {
    // Don't navigate if user just finished a drag inside the cell
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
        "min-h-[110px] bg-zinc-900 hover:bg-zinc-800/70 transition-colors flex flex-col items-stretch text-left p-2 gap-1 cursor-pointer",
        !inMonth && "opacity-40",
        isExamDay && "ring-1 ring-inset ring-red-500/60",
        dragOver && "ring-2 ring-inset ring-blue-400 bg-zinc-800/80"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs w-6 h-6 leading-6 text-center rounded-full",
            isToday ? "bg-blue-500 text-zinc-950 font-bold" : "text-zinc-300"
          )}
        >
          {date.getDate()}
        </span>
        {isExamDay && (
          <span className="text-[10px] uppercase tracking-wide text-red-400 font-semibold">Exam</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {visible.map((b) => {
          const cat = getCategory(categories, b.category);
          return (
            <div
              key={b.id}
              draggable
              onDragStart={(e) => onDragStart(e, b.id)}
              onClick={(e) => e.stopPropagation() || navigate(`/day/${myKey}`)}
              title="Drag to move to another day · click to open"
              className="text-[11px] px-1.5 py-0.5 rounded truncate font-medium cursor-grab active:cursor-grabbing"
              style={{ background: cat.color, color: textOn(cat.color) }}
            >
              {b.title || cat.label}
            </div>
          );
        })}
        {more > 0 && <div className="text-[10px] text-zinc-500">+{more} more</div>}
      </div>
    </div>
  );
}
