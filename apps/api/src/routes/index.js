import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { healthRouter } from "./health.js";
import { meRouter } from "./me.js";

export const apiRouter = Router();

// Public
apiRouter.use("/health", healthRouter);

// Everything below requires a logged-in user
apiRouter.use(requireAuth);
apiRouter.use("/me", meRouter);
