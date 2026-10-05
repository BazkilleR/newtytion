import { cn } from "@/lib/utils.js";

/** Preset date ranges in one row above the content they scope. */
export function RangePicker({ options, value, onChange }) {
  return (
    <fieldset
      aria-label="Date range"
      className="inline-flex gap-1 justify-self-start rounded-lg bg-muted p-1"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-9 rounded-md px-3 text-sm transition-colors",
            value === opt.value
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </fieldset>
  );
}
