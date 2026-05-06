import { COLOR_PALETTE } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function ColorPicker({ value, onChange }) {
  return (
    <div>
      <div className="grid grid-cols-10 gap-1.5">
        {COLOR_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            className={cn(
              "h-7 w-7 rounded-md transition-transform hover:scale-110 ring-offset-2 ring-offset-surface-2 outline-none",
              value === c
                ? "ring-2 ring-text-1"
                : "ring-1 ring-border"
            )}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={`Pick ${c}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <span className="text-[11px] uppercase tracking-[0.04em] text-text-3 font-medium">
          Custom
        </span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 rounded cursor-pointer bg-transparent border border-border"
        />
        <span className="font-mono text-[12px] text-text-2 tabular">{value}</span>
      </div>
    </div>
  );
}
