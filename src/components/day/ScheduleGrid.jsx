import { useEffect, useRef, useState } from "react";
import { formatHour, formatTimeRange, minutesToTime, timeToMinutes } from "@/lib/time";
import { getCategory, textOn } from "@/lib/categories";
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

/**
 * Google-Calendar-style schedule grid with:
 *   - Drag empty area to create a block
 *   - Drag existing block body to move it (snaps to 15min)
 *   - Drag bottom edge of a block to resize
 *   - Click a block to edit
 */
export function ScheduleGrid({ blocks, categories, onCreate, onUpdate, onEdit }) {
  const gridRef = useRef(null);
  const [interaction, setInteraction] = useState(null); // { type, blockId, startMin, ghost }

  // Helper to convert pointer Y to minutes-from-START_HOUR
  const yToMinutes = (clientY) => {
    const rect = gridRef.current.getBoundingClientRect();
    return pxToMinutes(clientY - rect.top);
  };

  // ── Begin drag-to-create ─────────────────────────────
  const onBgPointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target !== e.currentTarget) return; // only fire when clicking blank area
    e.preventDefault();
    const startMin = snap(yToMinutes(e.clientY));
    setInteraction({
      type: "create",
      anchorMin: startMin,
      ghost: { startMin, endMin: startMin + SNAP_MINUTES },
    });
    gridRef.current.setPointerCapture(e.pointerId);
  };

  // ── Begin block move/resize ──────────────────────────
  const onBlockPointerDown = (e, block, mode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const startBlockMin = timeToMinutes(block.start);
    const endBlockMin = timeToMinutes(block.end);
    const grabMin = yToMinutes(e.clientY);
    setInteraction({
      type: mode, // "move" | "resize"
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
      // Treat very short drags as click-to-create-default
      if (dur >= SNAP_MINUTES) {
        onCreate({
          start: minutesToTime(ghost.startMin + START_HOUR * 60),
          end: minutesToTime(ghost.endMin + START_HOUR * 60),
        });
      } else {
        // Default 1-hour block
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
        // No movement → treat as click → open editor
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

  return (
    <div className="flex h-full overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
      {/* Hour labels */}
      <div className="w-16 flex-shrink-0 relative" style={{ height: TOTAL_PX }}>
        {Array.from({ length: HOURS + 1 }, (_, i) => START_HOUR + i).map((h) => (
          <div
            key={h}
            className="absolute right-2 text-[11px] text-zinc-500"
            style={{ top: (h - START_HOUR) * PX_PER_HOUR - 6 }}
          >
            {formatHour(h)}
          </div>
        ))}
      </div>

      {/* Grid + blocks */}
      <div
        ref={gridRef}
        className="flex-1 relative border-l border-zinc-800 no-select"
        style={{ height: TOTAL_PX }}
        onPointerDown={onBgPointerDown}
        onPointerMove={onPointerMove}
      >
        {/* Hour lines */}
        {Array.from({ length: HOURS }, (_, i) => i).map((i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-zinc-800"
            style={{ top: i * PX_PER_HOUR }}
          />
        ))}
        {/* Half-hour lines */}
        {Array.from({ length: HOURS }, (_, i) => i).map((i) => (
          <div
            key={`half-${i}`}
            className="absolute left-0 right-0 border-t border-dashed border-zinc-900"
            style={{ top: i * PX_PER_HOUR + PX_PER_HOUR / 2 }}
          />
        ))}

        {/* Blocks */}
        {blocks.map((b) => {
          const cat = getCategory(categories, b.category);
          const startMin = timeToMinutes(b.start) - START_HOUR * 60;
          const endMin = timeToMinutes(b.end) - START_HOUR * 60;
          const top = (startMin / 60) * PX_PER_HOUR;
          const height = ((endMin - startMin) / 60) * PX_PER_HOUR;
          if (height <= 0) return null;
          const isDragging =
            interaction && (interaction.blockId === b.id || (interaction.type === "create"));
          const isMine = interaction?.blockId === b.id;
          return (
            <div
              key={b.id}
              className={cn(
                "absolute left-1 right-1 rounded-md px-2 py-1 cursor-grab active:cursor-grabbing shadow",
                isMine && "opacity-60"
              )}
              style={{
                top,
                height: Math.max(height - 2, 18),
                background: cat.color,
                color: textOn(cat.color),
              }}
              onPointerDown={(e) => onBlockPointerDown(e, b, "move")}
            >
              <div className="text-[12px] font-semibold leading-tight truncate">
                {b.title || cat.label}
              </div>
              <div className="text-[10px] opacity-80 leading-tight">
                {formatTimeRange(b.start, b.end)}
              </div>
              {b.notes && height > 50 && (
                <div className="text-[11px] opacity-80 mt-0.5 line-clamp-2">{b.notes}</div>
              )}
              {/* Resize handle */}
              <div
                onPointerDown={(e) => onBlockPointerDown(e, b, "resize")}
                className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize"
                style={{ background: "rgba(0,0,0,0.0)" }}
              />
            </div>
          );
        })}

        {/* Drag-to-create / move ghost */}
        {interaction && interaction.ghost && (
          <div
            className={cn(
              "absolute left-1 right-1 rounded-md border-2 border-dashed pointer-events-none",
              interaction.type === "create" ? "border-blue-400 bg-blue-400/20" : "border-white/70 bg-white/5"
            )}
            style={{
              top: (interaction.ghost.startMin / 60) * PX_PER_HOUR,
              height:
                ((interaction.ghost.endMin - interaction.ghost.startMin) / 60) * PX_PER_HOUR,
            }}
          >
            <div className="text-[10px] px-2 py-0.5 text-white/90">
              {minutesToTime(interaction.ghost.startMin + START_HOUR * 60)} –{" "}
              {minutesToTime(interaction.ghost.endMin + START_HOUR * 60)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
