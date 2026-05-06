import { useEffect, useMemo, useRef, useState } from "react";
import { MonthSection } from "./MonthSection";
import { resolveCategories } from "@/lib/categories";

/**
 * Infinite-scroll month view. Scrolls vertically through months from the
 * current month up to (but not past) the user's exam date. Auto-scrolls to
 * "today" on first mount.
 */
export function MonthView({ days, examDate, settings }) {
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
    <div ref={containerRef} className="overflow-y-auto h-full bg-zinc-950">
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
            />
          </div>
        );
      })}
      {examDate && (
        <div className="px-5 py-8 text-center text-zinc-500 text-sm">
          📅 Exam on{" "}
          <strong className="text-zinc-300">
            {new Date(examDate + "T00:00").toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </strong>
          {" "}— calendar ends here. Good luck!
        </div>
      )}
    </div>
  );
}
