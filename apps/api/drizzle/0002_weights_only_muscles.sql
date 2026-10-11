-- Hand-edited: the generated SQL altered secondary_muscles before adding it, and
-- couldn't know how to drop non-weights workouts or map the old muscle groups.
-- 1) weight training only: drop the other activity types and their workouts
DELETE FROM "workouts" WHERE "activity_type" <> 'weights';--> statement-breakpoint
ALTER TABLE "workouts" DROP COLUMN "activity_type";--> statement-breakpoint
DROP TYPE "public"."activity_type";--> statement-breakpoint
-- 2) finer muscle groups: go through text so the enum can be recreated
ALTER TABLE "exercises" ALTER COLUMN "muscle_group" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."muscle_group";--> statement-breakpoint
CREATE TYPE "public"."muscle_group" AS ENUM('chest', 'shoulders', 'triceps', 'biceps', 'forearms', 'traps', 'lats', 'lower_back', 'abs', 'quads', 'hamstrings', 'glutes', 'calves');--> statement-breakpoint
-- 3) coarse mapping of the old groups; `pnpm db:seed` then sets the exact
--    primary/secondary muscles of the global exercises
UPDATE "exercises" SET "muscle_group" = CASE "muscle_group"
  WHEN 'back' THEN 'lats'
  WHEN 'arms' THEN 'biceps'
  WHEN 'legs' THEN 'quads'
  WHEN 'core' THEN 'abs'
  WHEN 'full_body' THEN 'glutes'
  ELSE "muscle_group"
END;--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "muscle_group" SET DATA TYPE "public"."muscle_group" USING "muscle_group"::"public"."muscle_group";--> statement-breakpoint
-- 4) secondary muscles (half a set each in muscle volume)
ALTER TABLE "exercises" ADD COLUMN "secondary_muscles" "public"."muscle_group"[] DEFAULT '{}' NOT NULL;
