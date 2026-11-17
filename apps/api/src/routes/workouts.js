import {
  copyLastSessionInputSchema,
  createSetInputSchema,
  createWorkoutInputSchema,
  idParamsSchema,
  muscleSetsQuerySchema,
  setParamsSchema,
  updateSetInputSchema,
  updateWorkoutInputSchema,
  workoutListQuerySchema,
} from "@fitness/shared";
import { Router } from "express";
import * as workoutsService from "../services/workouts.service.js";

export const workoutsRouter = Router();

workoutsRouter.get("/", async (req, res) => {
  const query = workoutListQuerySchema.parse(req.query);
  res.json(await workoutsService.listWorkouts(res.locals.userId, query));
});

workoutsRouter.post("/", async (req, res) => {
  const input = createWorkoutInputSchema.parse(req.body);
  res.status(201).json(await workoutsService.createWorkout(res.locals.userId, input));
});

// Before "/:id" so "muscle-sets" isn't parsed as an id.
workoutsRouter.get("/muscle-sets", async (req, res) => {
  const query = muscleSetsQuerySchema.parse(req.query);
  res.json(await workoutsService.getMuscleSets(res.locals.userId, query));
});

workoutsRouter.get("/:id", async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await workoutsService.getWorkoutDetail(res.locals.userId, id));
});

workoutsRouter.patch("/:id", async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  const input = updateWorkoutInputSchema.parse(req.body);
  res.json(await workoutsService.updateWorkout(res.locals.userId, id, input));
});

workoutsRouter.delete("/:id", async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  await workoutsService.deleteWorkout(res.locals.userId, id);
  res.status(204).end();
});

workoutsRouter.post("/:id/sets", async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  const input = createSetInputSchema.parse(req.body);
  res.status(201).json(await workoutsService.addSet(res.locals.userId, id, input));
});

workoutsRouter.patch("/:id/sets/:setId", async (req, res) => {
  const { id, setId } = setParamsSchema.parse(req.params);
  const input = updateSetInputSchema.parse(req.body);
  res.json(await workoutsService.updateSet(res.locals.userId, id, setId, input));
});

workoutsRouter.delete("/:id/sets/:setId", async (req, res) => {
  const { id, setId } = setParamsSchema.parse(req.params);
  await workoutsService.deleteSet(res.locals.userId, id, setId);
  res.status(204).end();
});

workoutsRouter.post("/:id/copy-last", async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  const { exerciseId } = copyLastSessionInputSchema.parse(req.body);
  res.status(201).json(await workoutsService.copyLastSession(res.locals.userId, id, exerciseId));
});
