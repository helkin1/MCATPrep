import { useEffect, useMemo, useRef, useState } from "react";
import { MonthSection } from "./MonthSection";
import { resolveCategories } from "@/lib/categories";

/**
 * Infinite-scroll month view. Scrolls vertically through months from the
 * current month up to (but not past) the user's exam date. Auto-scrolls to
 * "today" on first mount.
 */
export function MonthView({ days, examDate, settings, onMoveBlock }) {
  const containerRef = useRef(null);
  const todayRef = useRef(null);
  const [scrolledToToday, setScrolledToToday] = useState(false);

  const categories = useMemo(
    () => resolveCategories(settings?.categories || []),
    [settings]
  );

  // Build the list of month slots: from current month → exam month
  // (or +12 months out if no exam date).
  const months = useMemo(() => {
    const today = new Date();
    const startY = today.getFullYear();
    const startM = today.getMonth();

    let endY, endM;
    if (examDate) {
      const e = new Date(examDate + "T00:00");
      endY = e.getFullYear();
      endM = e.getMonth();
    } else {
      const d = new Date(startY, startM + 12, 1);
      endY = d.getFullYear();
      endM = d.getMonth();
    }

    const list = [];
    let y = startY, m = startM;
    while (y < endY || (y === endY && m <= endM)) {
      list.push({ year: y, month: m });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return list;
  }, [examDate]);

  useEffect(() => {
    if (scrolledToToday) return;
    if (todayRef.current && containerRef.current) {
      todayRef.current.scrollIntoView({ behavior: "instant", block: "start" });
      setScrolledToToday(true);
    }
  }, [scrolledToToday]);

  const today = new Date();
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div ref={containerRef} className="overflow-y-auto h-full bg-bg">
      {months.map(({ year, month }) => {
        const key = `${year}-${String(month + 1).padStart(2, "0")}`;
        const label = new Date(year, month, 1).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        });
        return (
          <div key={key} ref={key === currentKey ? todayRef : null}>
            <MonthSection
              year={year}
              month={month}
              days={days}
              categories={categories}
              examDate={examDate}
              monthLabel={label}
              onMoveBlock={onMoveBlock}
            />
          </div>
        );
      })}
      {examDate && (
        <div className="px-5 py-10 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-3 bg-surface-1 border border-border rounded-xl">
            <div className="w-2 h-2 rounded-full bg-danger" />
            <div className="text-left">
              <div className="text-[11px] uppercase tracking-[0.08em] text-text-3">
                Exam day
              </div>
              <div className="font-display text-[14px] font-semibold tabular text-text-1">
                {new Date(examDate + "T00:00").toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 text-[12px] text-text-3">Good luck.</div>
        </div>
      )}
    </div>
  );
}
