export const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const formatKcal = (n) => Math.round(n).toLocaleString("en-US");

/** One decimal at most: 40.6, 36 */
export const formatGrams = (n) => String(Math.round(n * 10) / 10);

/** Total amount for `quantity` servings: "150 g", "1.5 plate". */
export function formatServing(food, quantity = 1) {
  return `${formatGrams(food.servingSize * quantity)} ${food.servingUnit}`;
}

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "Today", "Yesterday", or "Mon 5 Oct". `date` and `today` are YYYY-MM-DD. */
export function formatDayLabel(date, today, yesterday, tomorrow) {
  if (date === today) return "Today";
  if (date === yesterday) return "Yesterday";
  if (date === tomorrow) return "Tomorrow";
  // Parse as UTC midnight and format in UTC so the calendar day can't shift.
  return dayFormatter.format(new Date(`${date}T00:00:00Z`));
}
