"use client";

import { goalsSchema, suggestMacroTargets } from "@fitness/shared";
import { useState } from "react";
import { FormField } from "@/components/FormField.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { api } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.jsx";
import { useApi } from "@/lib/use-api.js";
import { toNumber, useForm } from "@/lib/use-form.js";

const FIELDS = [
  { name: "kcalTarget", label: "Calories (kcal)" },
  { name: "proteinTargetG", label: "Protein (g)" },
  { name: "carbTargetG", label: "Carbs (g)" },
  { name: "fatTargetG", label: "Fat (g)" },
];

function GoalsForm({ initial }) {
  const [savedAt, setSavedAt] = useState(null);
  const form = useForm({
    schema: goalsSchema,
    initialValues: Object.fromEntries(FIELDS.map((f) => [f.name, String(initial[f.name])])),
    prepare: (v) => Object.fromEntries(FIELDS.map((f) => [f.name, toNumber(v[f.name])])),
    onSubmit: async (input) => {
      await api("/goals", { method: "PUT", body: input });
      setSavedAt(new Date());
    },
  });

  function suggest() {
    const kcal = toNumber(form.values.kcalTarget);
    const protein = toNumber(form.values.proteinTargetG);
    if (kcal === undefined || protein === undefined) return;
    const { carbTargetG, fatTargetG } = suggestMacroTargets(kcal, protein);
    form.setValue("carbTargetG", String(carbTargetG));
    form.setValue("fatTargetG", String(fatTargetG));
  }

  return (
    <form onSubmit={form.handleSubmit} noValidate className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <FormField
            key={f.name}
            id={f.name}
            label={f.label}
            inputMode="numeric"
            error={form.errors[f.name]}
            {...form.field(f.name)}
          />
        ))}
      </div>
      <Button type="button" variant="outline" className="h-11" onClick={suggest}>
        Suggest carbs &amp; fat from calories
      </Button>
      <p className="-mt-2 text-xs text-muted-foreground">
        25% of calories from fat, the rest after protein from carbs.
      </p>
      {form.formError && (
        <p role="alert" className="text-sm text-destructive">
          {form.formError}
        </p>
      )}
      <Button type="submit" className="h-11" disabled={form.isSubmitting}>
        {form.isSubmitting ? "Saving…" : "Save goals"}
      </Button>
      {savedAt && !form.isSubmitting && (
        <p role="status" className="text-sm text-muted-foreground">
          Saved.
        </p>
      )}
    </form>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const goals = useApi("/goals");

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Daily goals</CardTitle>
        </CardHeader>
        <CardContent>
          {goals.error && <p className="text-sm text-destructive">{goals.error.message}</p>}
          {goals.isLoading && !goals.data && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {goals.data && <GoalsForm initial={goals.data} />}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
    </div>
  );
}
