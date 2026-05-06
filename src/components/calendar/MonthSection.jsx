import { DayCell } from "./DayCell";
import { dayKey, todayKey } from "@/lib/time";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Renders one month as a 6-week grid. Days outside the month are dimmed.
 * Used as a section in the infinite-scroll month view.
 */
export function MonthSection({ year, month, days, categories, examDate, monthLabel, onMoveBlock }) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(1 - startOffset);
  const today = todayKey();

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const k = dayKey(d);
    cells.push(
      <DayCell
        key={k}
        date={d}
        inMonth={d.getMonth() === month}
        isToday={k === today}
        isExamDay={examDate === k}
        dayData={days[k]}
        categories={categories}
        onMoveBlock={onMoveBlock}
      />
    );
  }

  return (
    <section data-month={`${year}-${String(month + 1).padStart(2, "0")}`}>
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur px-5 py-2 border-b border-zinc-800">
        <h2 className="text-sm font-semibold tracking-tight">{monthLabel}</h2>
      </div>
      <div className="grid grid-cols-7 gap-px bg-zinc-800">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-zinc-900 px-2 py-1.5 text-[10px] uppercase tracking-wide text-zinc-500"
          >
            {d}
          </div>
        ))}
        {cells}
      </div>
    </section>
  );
}
