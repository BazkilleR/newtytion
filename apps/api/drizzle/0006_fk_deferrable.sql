-- Check "is this food / exercise still in use" at commit instead of mid-statement.
-- Deleting a user cascades to their foods/exercises and to the meal entries/sets that
-- use them; with an immediate check, Postgres could reject the exercise delete before
-- the workout cascade had removed its sets. Deleting an in-use row directly still fails
-- with 23503. Drizzle can't express DEFERRABLE, so this lives in a custom migration.
ALTER TABLE "meal_entries" ALTER CONSTRAINT "meal_entries_food_id_foods_id_fk" DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "workout_sets" ALTER CONSTRAINT "workout_sets_exercise_id_exercises_id_fk" DEFERRABLE INITIALLY DEFERRED;
