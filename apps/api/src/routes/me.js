import { Router } from "express";
import * as authService from "../services/auth.service.js";

export const meRouter = Router();

meRouter.get("/", async (_req, res) => {
  res.json(await authService.getUser(res.locals.userId));
});
