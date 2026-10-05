import { createFoodInputSchema } from "@fitness/shared";
import { FormField } from "@/components/FormField.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { api } from "@/lib/api.js";
import { toNumber, useForm } from "@/lib/use-form.js";

const NUMBER_FIELDS = ["kcal", "proteinG", "carbG", "fatG", "servingSize"];

function CustomFoodForm({ initialName, onCreated }) {
  const form = useForm({
    schema: createFoodInputSchema,
    initialValues: {
      name: initialName,
      kcal: "",
      proteinG: "",
      carbG: "",
      fatG: "",
      servingSize: "1",
      servingUnit: "serving",
    },
    prepare: (values) => ({
      ...values,
      ...Object.fromEntries(NUMBER_FIELDS.map((k) => [k, toNumber(values[k])])),
    }),
    onSubmit: async (input) => {
      const food = await api("/foods", { method: "POST", body: input });
      onCreated(food);
    },
  });

  const numberField = (name, label) => (
    <FormField
      id={`food-${name}`}
      label={label}
      inputMode="decimal"
      error={form.errors[name]}
      {...form.field(name)}
    />
  );

  return (
    <form onSubmit={form.handleSubmit} noValidate className="grid gap-3">
      <FormField id="food-name" label="Name" error={form.errors.name} {...form.field("name")} />
      <div className="grid grid-cols-2 gap-3">
        {numberField("servingSize", "Serving size")}
        <FormField
          id="food-servingUnit"
          label="Unit"
          placeholder="g, plate, bowl"
          error={form.errors.servingUnit}
          {...form.field("servingUnit")}
        />
      </div>
      <p className="text-xs text-muted-foreground">Nutrition for one serving:</p>
      <div className="grid grid-cols-2 gap-3">
        {numberField("kcal", "Calories (kcal)")}
        {numberField("proteinG", "Protein (g)")}
        {numberField("carbG", "Carbs (g)")}
        {numberField("fatG", "Fat (g)")}
      </div>
      {form.formError && (
        <p role="alert" className="text-sm text-destructive">
          {form.formError}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" className="h-11 w-full" disabled={form.isSubmitting}>
          {form.isSubmitting ? "Saving…" : "Create food"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CustomFoodDialog({ open, onOpenChange, initialName = "", onCreated }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New custom food</DialogTitle>
          <DialogDescription>Only you can see foods you create.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the form resets every time */}
        {open && <CustomFoodForm initialName={initialName} onCreated={onCreated} />}
      </DialogContent>
    </Dialog>
  );
}
