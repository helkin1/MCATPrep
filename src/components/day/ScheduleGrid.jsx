import { useEffect, useRef, useState } from "react";
import { formatHour, formatTimeRange, minutesToTime, timeToMinutes } from "@/lib/time";
import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

const START_HOUR = 5;
const END_HOUR = 24;
const PX_PER_HOUR = 60;
const SNAP_MINUTES = 15;

const HOURS = END_HOUR - START_HOUR;
const TOTAL_PX = HOURS * PX_PER_HOUR;

function snap(min) {
  return Math.round(min / SNAP_MINUTES) * SNAP_MINUTES;
}

function pxToMinutes(px) {
  return Math.max(0, Math.min(HOURS * 60, (px / PX_PER_HOUR) * 60));
}

function tint(hex, alpha) {
  const c = (hex || "#888").replace("#", "");
  if (c.length !== 6) return `rgba(136,136,136,${alpha})`;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Schedule grid:
 *   - Drag empty area to create a block
 *   - Drag block body to move (snaps to 15min)
 *   - Drag bottom edge to resize
 *   - Click a block to edit
 */
export function ScheduleGrid({ blocks, categories, onCreate, onUpdate, onEdit }) {
  const gridRef = useRef(null);
  const [interaction, setInteraction] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const yToMinutes = (clientY) => {
    const rect = gridRef.current.getBoundingClientRect();
    return pxToMinutes(clientY - rect.top);
  };

  const onBgPointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    const startMin = snap(yToMinutes(e.clientY));
    setInteraction({
      type: "create",
      anchorMin: startMin,
      ghost: { startMin, endMin: startMin + SNAP_MINUTES },
    });
    gridRef.current.setPointerCapture(e.pointerId);
  };

  const onBlockPointerDown = (e, block, mode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const startBlockMin = timeToMinutes(block.start);
    const endBlockMin = timeToMinutes(block.end);
    const grabMin = yToMinutes(e.clientY);
    setInteraction({
      type: mode,
      blockId: block.id,
      origStart: startBlockMin,
      origEnd: endBlockMin,
      grabOffset: grabMin - startBlockMin,
      moved: false,
      ghost: { startMin: startBlockMin, endMin: endBlockMin },
    });
    gridRef.current.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!interaction) return;
    const min = yToMinutes(e.clientY);

    if (interaction.type === "create") {
      const a = interaction.anchorMin;
      const b = snap(min);
      const startMin = Math.min(a, b);
      const endMin = Math.max(a + SNAP_MINUTES, b);
      setInteraction({ ...interaction, ghost: { startMin, endMin } });
    } else if (interaction.type === "move") {
      const newStart = snap(min - interaction.grabOffset);
      const length = interaction.origEnd - interaction.origStart;
      const startMin = Math.max(0, Math.min(HOURS * 60 - length, newStart));
      const endMin = startMin + length;
      setInteraction({
        ...interaction,
        moved: Math.abs(startMin - interaction.origStart) > 0,
        ghost: { startMin, endMin },
      });
    } else if (interaction.type === "resize") {
      const endMin = Math.max(interaction.origStart + SNAP_MINUTES, snap(min));
      setInteraction({
        ...interaction,
        moved: endMin !== interaction.origEnd,
        ghost: { startMin: interaction.origStart, endMin },
      });
    }
  };

  const onPointerUp = (e) => {
    if (!interaction) return;
    const { type, ghost } = interaction;
    gridRef.current.releasePointerCapture?.(e.pointerId);

    if (type === "create") {
      const dur = ghost.endMin - ghost.startMin;
      if (dur >= SNAP_MINUTES) {
        onCreate({
          start: minutesToTime(ghost.startMin + START_HOUR * 60),
          end: minutesToTime(ghost.endMin + START_HOUR * 60),
        });
      } else {
        onCreate({
          start: minutesToTime(ghost.startMin + START_HOUR * 60),
          end: minutesToTime(ghost.startMin + START_HOUR * 60 + 60),
        });
      }
    } else if (type === "move" || type === "resize") {
      if (interaction.moved) {
        onUpdate(interaction.blockId, {
          start: minutesToTime(ghost.startMin + START_HOUR * 60),
          end: minutesToTime(ghost.endMin + START_HOUR * 60),
        });
      } else if (type === "move") {
        onEdit(interaction.blockId);
      }
    }
    setInteraction(null);
  };

  useEffect(() => {
    if (!interaction) return;
    const stop = (e) => onPointerUp(e);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interaction]);

  // Now indicator (only shown if within visible window)
  const nowMin = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
  const showNow = nowMin >= 0 && nowMin <= HOURS * 60;
  const nowTop = (nowMin / 60) * PX_PER_HOUR;

  return (
    <div className="flex h-full overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
      {/* Hour labels */}
      <div className="w-16 flex-shrink-0 relative" style={{ height: TOTAL_PX }}>
        {Array.from({ length: HOURS + 1 }, (_, i) => START_HOUR + i).map((h) => (
          <div
            key={h}
            className="absolute right-3 font-mono tabular text-[10px] text-text-3 uppercase tracking-wider"
            style={{ top: (h - START_HOUR) * PX_PER_HOUR - 5 }}
          >
            {formatHour(h)}
          </div>
        ))}
      </div>

      {/* Grid + blocks */}
      <div
        ref={gridRef}
        className="flex-1 relative no-select"
        style={{ height: TOTAL_PX }}
        onPointerDown={onBgPointerDown}
        onPointerMove={onPointerMove}
      >
        {/* Hour lines — soft */}
        {Array.from({ length: HOURS }, (_, i) => i).map((i) => (
          <div
            key={i}
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: i * PX_PER_HOUR,
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          />
        ))}
        {/* Half-hour ticks — even softer */}
        {Array.from({ length: HOURS }, (_, i) => i).map((i) => (
          <div
            key={`half-${i}`}
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: i * PX_PER_HOUR + PX_PER_HOUR / 2,
              borderTop: "1px dashed rgba(255,255,255,0.025)",
            }}
          />
        ))}

        {/* Now indicator */}
        {showNow && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-10"
            style={{ top: nowTop }}
          >
            <div className="relative">
              <div className="absolute -left-1 -top-[3px] w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgba(124,156,255,0.18)]" />
              <div className="border-t border-accent/70" />
            </div>
          </div>
        )}

        {/* Blocks */}
        {blocks.map((b) => {
          const cat = getCategory(categories, b.category);
          const startMin = timeToMinutes(b.start) - START_HOUR * 60;
          const endMin = timeToMinutes(b.end) - START_HOUR * 60;
          const top = (startMin / 60) * PX_PER_HOUR;
          const height = ((endMin - startMin) / 60) * PX_PER_HOUR;
          if (height <= 0) return null;
          const isMine = interaction?.blockId === b.id;
          return (
            <div
              key={b.id}
              className={cn(
                "absolute left-1 right-1 rounded-md cursor-grab active:cursor-grabbing overflow-hidden",
                "transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out)]",
                "hover:shadow-md",
                isMine && "opacity-60"
              )}
              style={{
                top,
                height: Math.max(height - 2, 18),
                background: tint(cat.color, 0.16),
                borderLeft: `3px solid ${cat.color}`,
              }}
              onPointerDown={(e) => onBlockPointerDown(e, b, "move")}
            >
              <div className="px-2.5 py-1 h-full flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12px] font-semibold leading-tight truncate text-text-1">
                    {b.title || cat.label}
                  </div>
                  <div className="font-mono tabular text-[10px] text-text-2 flex-shrink-0">
                    {formatTimeRange(b.start, b.end)}
                  </div>
                </div>
                {b.notes && height > 50 && (
                  <div className="text-[11px] text-text-2 mt-0.5 line-clamp-2">
                    {b.notes}
                  </div>
                )}
              </div>
              {/* Resize handle */}
              <div
                onPointerDown={(e) => onBlockPointerDown(e, b, "resize")}
                className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize"
              />
            </div>
          );
        })}

        {/* Drag-to-create / move ghost */}
        {interaction && interaction.ghost && (
          <div
            className={cn(
              "absolute left-1 right-1 rounded-md pointer-events-none border-2 border-dashed",
              interaction.type === "create"
                ? "border-accent bg-accent-soft"
                : "border-text-2/60 bg-surface-3/50"
            )}
            style={{
              top: (interaction.ghost.startMin / 60) * PX_PER_HOUR,
              height:
                ((interaction.ghost.endMin - interaction.ghost.startMin) / 60) * PX_PER_HOUR,
            }}
          >
            <div className="font-mono tabular text-[10px] px-2 py-0.5 text-text-1">
              {minutesToTime(interaction.ghost.startMin + START_HOUR * 60)} –{" "}
              {minutesToTime(interaction.ghost.endMin + START_HOUR * 60)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
