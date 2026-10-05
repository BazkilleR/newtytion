import { isoDateSchema, mealTypeSchema, suggestMealType, todayIn } from "@fitness/shared";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { NumberStepper } from "@/components/NumberStepper.jsx";
import { CustomFoodDialog } from "@/components/nutrition/CustomFoodDialog.jsx";
import { MealTypePicker } from "@/components/nutrition/MealTypePicker.jsx";
import { NutritionPreview } from "@/components/nutrition/NutritionPreview.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Input } from "@/components/ui/input.jsx";
import { useDebouncedValue } from "@/hooks/use-debounced-value.js";
import { api } from "@/lib/api.js";
import { formatKcal, formatServing } from "@/lib/format.js";
import { useApi } from "@/lib/use-api.js";

function AddEntryDialog({ food, date, initialMealType, onClose, onAdded }) {
  const [quantity, setQuantity] = useState(1);
  const [mealType, setMealType] = useState(initialMealType);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleAdd() {
    setIsSaving(true);
    setError(null);
    try {
      await api("/meals", {
        method: "POST",
        body: { logDate: date, mealType, foodId: food.id, quantity },
      });
      onAdded();
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{food.name}</DialogTitle>
        <DialogDescription>{formatServing(food)} per serving</DialogDescription>
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
      <NutritionPreview food={food} quantity={quantity} />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={onClose}>
          Cancel
        </Button>
        <Button className="h-11" onClick={handleAdd} disabled={isSaving}>
          {isSaving ? "Adding…" : "Add"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function AddFoodPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const date = isoDateSchema.safeParse(dateParam).success ? dateParam : todayIn();
  const mealParam = mealTypeSchema.safeParse(searchParams.get("meal"));
  const initialMealType = mealParam.success ? mealParam.data : suggestMealType();

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q.trim());
  const results = useApi("/foods", { query: { q: debouncedQ } });

  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const backTo = date === todayIn() ? "/" : `/?date=${date}`;

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-lg">
          <Link to={backTo} aria-label="Back">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Add food</h1>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          autoFocus
          placeholder="Search foods, e.g. กะเพรา or chicken"
          aria-label="Search foods"
          className="h-11 pl-9 text-base"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Button variant="outline" className="h-11 justify-start" onClick={() => setCreating(true)}>
        <Plus /> Create custom food{q.trim() ? ` "${q.trim()}"` : ""}
      </Button>

      {results.error && <p className="text-sm text-destructive">{results.error.message}</p>}

      {results.data && results.data.length === 0 && (
        <p className="text-sm text-muted-foreground">No foods match "{debouncedQ}".</p>
      )}

      {results.data && results.data.length > 0 && (
        <ul
          className={
            results.isLoading
              ? "divide-y rounded-lg border opacity-60"
              : "divide-y rounded-lg border"
          }
        >
          {results.data.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => setSelected(food)}
                className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate">
                    {food.name}
                    {food.isCustom && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        Custom
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatServing(food)} · P {food.proteinG} g
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums">{formatKcal(food.kcal)} kcal</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <AddEntryDialog
            key={selected.id}
            food={selected}
            date={date}
            initialMealType={initialMealType}
            onClose={() => setSelected(null)}
            onAdded={() => navigate(backTo)}
          />
        )}
      </Dialog>

      <CustomFoodDialog
        open={creating}
        onOpenChange={setCreating}
        initialName={q.trim()}
        onCreated={(food) => {
          setCreating(false);
          results.refetch();
          setSelected(food);
        }}
      />
    </div>
  );
}
