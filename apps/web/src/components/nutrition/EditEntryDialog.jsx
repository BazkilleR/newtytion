import { useEffect, useState } from "react";
import { NumberStepper } from "@/components/NumberStepper.jsx";
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
import { formatServing } from "@/lib/format.js";
import { MealTypePicker } from "./MealTypePicker.jsx";
import { NutritionPreview } from "./NutritionPreview.jsx";

/** Change quantity / meal of a logged entry, or delete it. `entry` null = closed. */
export function EditEntryDialog({ entry, onClose, onChanged }) {
  const [quantity, setQuantity] = useState(1);
  const [mealType, setMealType] = useState("lunch");
  const [pending, setPending] = useState(null); // "save" | "delete" | null
  const [error, setError] = useState(null);

  useEffect(() => {
    if (entry) {
      setQuantity(entry.quantity);
      setMealType(entry.mealType);
      setError(null);
    }
  }, [entry]);

  async function run(kind, request) {
    setPending(kind);
    setError(null);
    try {
      await request();
      onChanged();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      {entry && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{entry.food.name}</DialogTitle>
            <DialogDescription>{formatServing(entry.food)} per serving</DialogDescription>
          </DialogHeader>

          <NumberStepper
            label="Servings"
            value={quantity}
            onChange={setQuantity}
            step={0.5}
            min={0.5}
            max={100}
          />
          <MealTypePicker value={mealType} onChange={setMealType} />
          <NutritionPreview food={entry.food} quantity={quantity} />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="destructive"
              className="h-11"
              disabled={pending !== null}
              onClick={() => run("delete", () => api(`/meals/${entry.id}`, { method: "DELETE" }))}
            >
              {pending === "delete" ? "Deleting…" : "Delete"}
            </Button>
            <Button
              className="h-11"
              disabled={pending !== null}
              onClick={() =>
                run("save", () =>
                  api(`/meals/${entry.id}`, { method: "PATCH", body: { quantity, mealType } }),
                )
              }
            >
              {pending === "save" ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
