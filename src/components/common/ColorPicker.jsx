import { COLOR_PALETTE } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function ColorPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          className={cn(
            "h-7 w-7 rounded-md border-2 transition-transform hover:scale-110",
            value === c ? "border-white" : "border-transparent"
          )}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`Pick ${c}`}
        />
      ))}
      <div className="col-span-10 flex items-center gap-2 mt-1.5">
        <span className="text-xs text-zinc-400">Custom:</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 rounded cursor-pointer bg-transparent border border-zinc-700"
        />
        <span className="text-xs font-mono text-zinc-400">{value}</span>
      </div>
    </div>
  );
}
