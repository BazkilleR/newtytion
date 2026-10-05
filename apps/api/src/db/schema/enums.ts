import { ACTIVITY_TYPES, MEAL_TYPES, MUSCLE_GROUPS } from "@fitness/shared";
import { pgEnum } from "drizzle-orm/pg-core";

// Enum values come from packages/shared so the DB, API validation and UI agree.
export const mealTypeEnum = pgEnum("meal_type", MEAL_TYPES);
export const activityTypeEnum = pgEnum("activity_type", ACTIVITY_TYPES);
export const muscleGroupEnum = pgEnum("muscle_group", MUSCLE_GROUPS);
