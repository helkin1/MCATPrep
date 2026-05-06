import { DayCell } from "./DayCell";
import { dayKey, todayKey } from "@/lib/time";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Renders one month as a 6-week grid of floating day cards.
 * Days outside the month are dimmed.
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
    <section data-month={`${year}-${String(month + 1).padStart(2, "0")}`} className="px-5 pb-6">
      {/* Sticky display header */}
      <div className="sticky top-0 z-10 -mx-5 px-5 pt-5 pb-3 bg-bg/85 backdrop-blur-md">
        <h2 className="font-display text-[22px] font-semibold tracking-tight text-text-1">
          {monthLabel}
        </h2>
      </div>

      {/* Weekday headers — no boxes, just labels */}
      <div className="grid grid-cols-7 gap-1.5 px-0.5 mb-2">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-[10px] uppercase tracking-[0.08em] text-text-3 font-medium px-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cards — floating, no gridlines */}
      <div className="grid grid-cols-7 gap-1.5">{cells}</div>
    </section>
  );
}
