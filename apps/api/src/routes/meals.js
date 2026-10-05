import {
  createMealEntryInputSchema,
  dailyMealsQuerySchema,
  idParamsSchema,
  updateMealEntryInputSchema,
} from "@fitness/shared";
import { Router } from "express";
import * as mealsService from "../services/meals.service.js";

export const mealsRouter = Router();

mealsRouter.get("/", async (req, res) => {
  const { date } = dailyMealsQuerySchema.parse(req.query);
  res.json(await mealsService.getDailyMeals(res.locals.userId, date));
});

mealsRouter.post("/", async (req, res) => {
  // z.object() strips unknown keys, so a `userId` in the body is simply dropped.
  const input = createMealEntryInputSchema.parse(req.body);
  res.status(201).json(await mealsService.createMealEntry(res.locals.userId, input));
});

mealsRouter.patch("/:id", async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  const input = updateMealEntryInputSchema.parse(req.body);
  res.json(await mealsService.updateMealEntry(res.locals.userId, id, input));
});

mealsRouter.delete("/:id", async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  await mealsService.deleteMealEntry(res.locals.userId, id);
  res.status(204).end();
});
