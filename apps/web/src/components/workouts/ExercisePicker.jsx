import { createExerciseInputSchema, MUSCLE_GROUP_LABELS, MUSCLE_GROUPS } from "@fitness/shared";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { FormField } from "@/components/FormField.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.jsx";
import { Input } from "@/components/ui/input.jsx";
import { api } from "@/lib/api.js";
import { useApi } from "@/lib/use-api.js";
import { useForm } from "@/lib/use-form.js";
import { cn } from "@/lib/utils.js";

function NewExerciseForm({ initialName, onCreated }) {
  const form = useForm({
    schema: createExerciseInputSchema,
    initialValues: { name: initialName, muscleGroup: "legs" },
    onSubmit: async (input) => onCreated(await api("/exercises", { method: "POST", body: input })),
  });

  return (
    <form onSubmit={form.handleSubmit} noValidate className="grid gap-3 rounded-lg border p-3">
      <FormField
        id="exercise-name"
        label="New exercise"
        error={form.errors.name}
        {...form.field("name")}
      />
      <div className="flex flex-wrap gap-1.5">
        {MUSCLE_GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={form.values.muscleGroup === g}
            onClick={() => form.setValue("muscleGroup", g)}
            className={cn(
              "h-9 rounded-full border px-3 text-sm",
              form.values.muscleGroup === g && "border-foreground bg-foreground text-background",
            )}
          >
            {MUSCLE_GROUP_LABELS[g]}
          </button>
        ))}
      </div>
      {form.formError && <p className="text-sm text-destructive">{form.formError}</p>}
      <Button type="submit" className="h-11" disabled={form.isSubmitting}>
        Create and add
      </Button>
    </form>
  );
}

/** Pick an exercise (searchable, grouped by muscle group) or create one. */
export function ExercisePicker({ open, onOpenChange, onPick, excludeIds = [] }) {
  const exercises = useApi("/exercises", { enabled: open });
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = (exercises.data ?? []).filter(
      (e) => !excludeIds.includes(e.id) && e.name.toLowerCase().includes(needle),
    );
    return MUSCLE_GROUPS.map((g) => [g, list.filter((e) => e.muscleGroup === g)]).filter(
      ([, items]) => items.length > 0,
    );
  }, [exercises.data, q, excludeIds]);

  function pick(exercise) {
    onPick(exercise);
    onOpenChange(false);
    setQ("");
    setCreating(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col">
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search exercises"
            aria-label="Search exercises"
            className="h-11 pl-9 text-base"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="-mx-4 flex-1 overflow-y-auto px-4">
          {exercises.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {exercises.error && <p className="text-sm text-destructive">{exercises.error.message}</p>}
          {groups.map(([group, items]) => (
            <section key={group} className="mb-3">
              <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {MUSCLE_GROUP_LABELS[group]}
              </h3>
              <ul className="divide-y rounded-lg border">
                {items.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => pick(e)}
                      className="flex min-h-12 w-full items-center px-3 text-left hover:bg-muted"
                    >
                      {e.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {exercises.data && groups.length === 0 && (
            <p className="mb-3 text-sm text-muted-foreground">No exercises match "{q.trim()}".</p>
          )}
          {creating ? (
            <NewExerciseForm initialName={q.trim()} onCreated={pick} />
          ) : (
            <Button variant="outline" className="h-11 w-full" onClick={() => setCreating(true)}>
              <Plus /> New exercise{q.trim() ? ` "${q.trim()}"` : ""}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
