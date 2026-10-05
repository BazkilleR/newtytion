import { updateWorkoutInputSchema } from "@fitness/shared";
import { useState } from "react";
import { FormField } from "@/components/FormField.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Label } from "@/components/ui/label.jsx";
import { api } from "@/lib/api.js";
import { toNumber, useForm } from "@/lib/use-form.js";

/** Date, duration and note — the whole log for running/judo, optional extras for weights. */
export function WorkoutDetailsForm({ workout, onSaved }) {
  const [saved, setSaved] = useState(false);
  const form = useForm({
    schema: updateWorkoutInputSchema,
    initialValues: {
      logDate: workout.logDate,
      durationMin: workout.durationMin === null ? "" : String(workout.durationMin),
      note: workout.note ?? "",
    },
    prepare: (v) => ({
      logDate: v.logDate,
      // empty = clear it; anything else must be a number (NaN fails validation)
      durationMin: v.durationMin.trim() === "" ? null : (toNumber(v.durationMin) ?? Number.NaN),
      note: v.note.trim() === "" ? null : v.note,
    }),
    onSubmit: async (input) => {
      onSaved(await api(`/workouts/${workout.id}`, { method: "PATCH", body: input }));
      setSaved(true);
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit}
      noValidate
      className="grid gap-3"
      onChange={() => setSaved(false)}
    >
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="logDate"
          label="Date"
          type="date"
          error={form.errors.logDate}
          {...form.field("logDate")}
        />
        <FormField
          id="durationMin"
          label="Duration (min)"
          inputMode="numeric"
          error={form.errors.durationMin}
          {...form.field("durationMin")}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="note">Note</Label>
        <textarea
          id="note"
          rows={3}
          className="rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="How did it feel?"
          {...form.field("note")}
        />
      </div>
      {form.formError && <p className="text-sm text-destructive">{form.formError}</p>}
      <Button type="submit" variant="outline" className="h-11" disabled={form.isSubmitting}>
        {form.isSubmitting ? "Saving…" : saved ? "Saved ✓" : "Save details"}
      </Button>
    </form>
  );
}
