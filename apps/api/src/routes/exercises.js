import { createExerciseInputSchema, idParamsSchema, lastSetsQuerySchema } from "@fitness/shared";
import { Router } from "express";
import * as exercisesService from "../services/exercises.service.js";
import * as workoutsService from "../services/workouts.service.js";

export const exercisesRouter = Router();

exercisesRouter.get("/", async (_req, res) => {
  res.json(await exercisesService.listExercises(res.locals.userId));
});

exercisesRouter.post("/", async (req, res) => {
  const input = createExerciseInputSchema.parse(req.body);
  res.status(201).json(await exercisesService.createExercise(res.locals.userId, input));
});

exercisesRouter.get("/:id/last-sets", async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  const query = lastSetsQuerySchema.parse(req.query);
  res.json(await workoutsService.getLastSession(res.locals.userId, id, query));
});
