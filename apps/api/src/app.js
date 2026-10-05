import { toNodeHandler } from "better-auth/node";
import express from "express";
import { auth } from "./auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { apiRouter } from "./routes/index.js";

/** Builds the Express app without listening, so tests can spin it up on a random port. */
export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  // Better Auth handles sign-up/sign-in/sign-out/get-session itself and reads
  // the raw request body, so it must be mounted BEFORE express.json().
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json({ limit: "100kb" }));

  app.use("/api", apiRouter);
  app.use("/api", notFoundHandler);
  app.use(errorHandler);

  return app;
}
