import { goalsSchema } from "@fitness/shared";
import { useState } from "react";
import { FormField } from "@/components/FormField.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { api } from "@/lib/api.js";
import { useSession } from "@/lib/auth-client.js";
import { useApi } from "@/lib/use-api.js";
import { toNumber, useForm } from "@/lib/use-form.js";

function GoalsForm({ initial }) {
  const [savedAt, setSavedAt] = useState(null);
  const form = useForm({
    schema: goalsSchema,
    initialValues: {
      kcalTarget: String(initial.kcalTarget),
      proteinTargetG: String(initial.proteinTargetG),
    },
    prepare: (v) => ({
      kcalTarget: toNumber(v.kcalTarget),
      proteinTargetG: toNumber(v.proteinTargetG),
    }),
    onSubmit: async (input) => {
      await api("/goals", { method: "PUT", body: input });
      setSavedAt(new Date());
    },
  });

  return (
    <form onSubmit={form.handleSubmit} noValidate className="grid gap-4">
      <FormField
        id="kcalTarget"
        label="Calories per day (kcal)"
        inputMode="numeric"
        error={form.errors.kcalTarget}
        {...form.field("kcalTarget")}
      />
      <FormField
        id="proteinTargetG"
        label="Protein per day (g)"
        inputMode="numeric"
        error={form.errors.proteinTargetG}
        {...form.field("proteinTargetG")}
      />
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

export function SettingsPage() {
  const { data: session } = useSession();
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
      <p className="text-sm text-muted-foreground">Signed in as {session?.user.email}</p>
    </div>
  );
}
