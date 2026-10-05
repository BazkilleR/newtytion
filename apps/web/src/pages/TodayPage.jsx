import { todayIn } from "@fitness/shared";
import { useApi } from "@/lib/use-api.js";

// Placeholder until Phase 3 (food logging). Calls a protected endpoint to
// prove the session cookie reaches Express through the Vite proxy.
export function TodayPage() {
  const me = useApi("/me");

  return (
    <section className="grid gap-2">
      <h1 className="text-2xl font-bold">Today</h1>
      <p className="text-sm text-muted-foreground">{todayIn()}</p>
      <p className="text-sm">
        {me.isLoading ? "Loading…" : me.error ? me.error.message : `Logged in as ${me.data.email}`}
      </p>
    </section>
  );
}
