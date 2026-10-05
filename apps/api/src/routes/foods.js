import {
  createFoodInputSchema,
  foodSearchQuerySchema,
  idParamsSchema,
  updateFoodInputSchema,
} from "@fitness/shared";
import { Router } from "express";
import * as foodsService from "../services/foods.service.js";

export const foodsRouter = Router();

foodsRouter.get("/", async (req, res) => {
  const query = foodSearchQuerySchema.parse(req.query);
  res.json(await foodsService.searchFoods(res.locals.userId, query));
});

foodsRouter.post("/", async (req, res) => {
  const input = createFoodInputSchema.parse(req.body);
  res.status(201).json(await foodsService.createFood(res.locals.userId, input));
});

foodsRouter.patch("/:id", async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  const input = updateFoodInputSchema.parse(req.body);
  res.json(await foodsService.updateFood(res.locals.userId, id, input));
});

foodsRouter.delete("/:id", async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  await foodsService.deleteFood(res.locals.userId, id);
  res.status(204).end();
});
