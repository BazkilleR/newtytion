ALTER TABLE "meal_entries" DROP CONSTRAINT "meal_entries_food_id_foods_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_sets" DROP CONSTRAINT "workout_sets_exercise_id_exercises_id_fk";
--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;