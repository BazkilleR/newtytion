import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { cn } from "@/lib/utils.js";

/**
 * Label + large input + inline error, wired for screen readers.
 * `action` is an optional button shown inside the input's right edge.
 */
export function FormField({ id, label, error, action, ...inputProps }) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          className={cn("h-11 text-base", action && "pr-11")}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {action && <div className="absolute inset-y-0 right-0 flex items-center">{action}</div>}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
