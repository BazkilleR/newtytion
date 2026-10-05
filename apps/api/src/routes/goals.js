import { goalsSchema } from "@fitness/shared";
import { Router } from "express";
import * as goalsService from "../services/goals.service.js";

export const goalsRouter = Router();

goalsRouter.get("/", async (_req, res) => {
  res.json(await goalsService.getGoals(res.locals.userId));
});

goalsRouter.put("/", async (req, res) => {
  const input = goalsSchema.parse(req.body);
  res.json(await goalsService.upsertGoals(res.locals.userId, input));
});
