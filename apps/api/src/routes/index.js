import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { foodsRouter } from "./foods.js";
import { goalsRouter } from "./goals.js";
import { healthRouter } from "./health.js";
import { meRouter } from "./me.js";
import { mealsRouter } from "./meals.js";

export const apiRouter = Router();

// Public
apiRouter.use("/health", healthRouter);

// Everything below requires a logged-in user
apiRouter.use(requireAuth);
apiRouter.use("/me", meRouter);
apiRouter.use("/foods", foodsRouter);
apiRouter.use("/meals", mealsRouter);
apiRouter.use("/goals", goalsRouter);
