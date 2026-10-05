-- Hand-edited: existing goals rows need values before the columns can be NOT NULL.
-- 1) add the columns as nullable
ALTER TABLE "goals" ADD COLUMN "carb_target_g" integer;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "fat_target_g" integer;--> statement-breakpoint
-- 2) backfill with the same rule as suggestMacroTargets() in packages/shared:
--    fat = 25% of kcal, carbs = what's left after protein and fat (never negative)
UPDATE "goals" SET "fat_target_g" = round("kcal_target" * 0.25 / 9);--> statement-breakpoint
UPDATE "goals" SET "carb_target_g" = greatest(0, round(("kcal_target" - "protein_target_g" * 4 - "fat_target_g" * 9) / 4.0));--> statement-breakpoint
-- 3) now every row has a value
ALTER TABLE "goals" ALTER COLUMN "carb_target_g" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "fat_target_g" SET NOT NULL;
