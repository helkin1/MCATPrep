import { useNavigate } from "react-router-dom";
import { dayKey } from "@/lib/time";
import { getCategory, textOn } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function DayCell({ date, inMonth, isToday, isExamDay, dayData, categories }) {
  const navigate = useNavigate();
  const blocks = dayData?.blocks || [];

  // Show top 3 events: prefer studyish, then earliest start
  const sorted = [...blocks].sort((a, b) => {
    const aS = (categories.find((c) => c.id === a.category)?.studyish ? 0 : 1);
    const bS = (categories.find((c) => c.id === b.category)?.studyish ? 0 : 1);
    if (aS !== bS) return aS - bS;
    return a.start.localeCompare(b.start);
  });
  const visible = sorted.slice(0, 3);
  const more = blocks.length - visible.length;

  return (
    <button
      type="button"
      onClick={() => navigate(`/day/${dayKey(date)}`)}
      className={cn(
        "min-h-[110px] bg-zinc-900 hover:bg-zinc-800/70 transition-colors flex flex-col items-stretch text-left p-2 gap-1",
        !inMonth && "opacity-40",
        isExamDay && "ring-1 ring-inset ring-red-500/60"
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
              className="text-[11px] px-1.5 py-0.5 rounded truncate font-medium"
              style={{ background: cat.color, color: textOn(cat.color) }}
            >
              {b.title || cat.label}
            </div>
          );
        })}
        {more > 0 && <div className="text-[10px] text-zinc-500">+{more} more</div>}
      </div>
    </button>
  );
}
