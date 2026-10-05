import {
  bodyLogDateParamsSchema,
  bodyLogRangeQuerySchema,
  upsertBodyLogInputSchema,
} from "@fitness/shared";
import { Router } from "express";
import * as bodyService from "../services/body.service.js";

export const bodyLogsRouter = Router();

bodyLogsRouter.get("/", async (req, res) => {
  const range = bodyLogRangeQuerySchema.parse(req.query);
  res.json(await bodyService.listBodyLogs(res.locals.userId, range));
});

// PUT on the date: idempotent "set my weight for this day".
bodyLogsRouter.put("/:date", async (req, res) => {
  const { date } = bodyLogDateParamsSchema.parse(req.params);
  const input = upsertBodyLogInputSchema.parse(req.body);
  res.json(await bodyService.upsertBodyLog(res.locals.userId, date, input));
});

bodyLogsRouter.delete("/:date", async (req, res) => {
  const { date } = bodyLogDateParamsSchema.parse(req.params);
  await bodyService.deleteBodyLog(res.locals.userId, date);
  res.status(204).end();
});
