/**
 * Tooltip card: date first (secondary), then one row per series with the
 * value leading (strong) and the series name following. Rows are keyed with a
 * small mark that mirrors the chart mark (dot or line) — never colored text.
 */
export function ChartTooltip({ title, rows }) {
  return (
    <div className="min-w-36 rounded-lg bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="mb-1 text-xs text-muted-foreground">{title}</p>
      <ul className="grid gap-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2">
            <SeriesKey kind={row.kind} color={row.color} />
            <span className="font-semibold tabular-nums">{row.value}</span>
            <span className="text-muted-foreground">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Legend/tooltip key: "dot" for point marks, "line" for line marks. */
export function SeriesKey({ kind, color }) {
  if (kind === "line") {
    return (
      <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: color }} />
    );
  }
  return (
    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: color }} />
  );
}

/** Legend row above a chart (one entry per series). */
export function ChartLegend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <SeriesKey kind={item.kind} color={item.color} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
