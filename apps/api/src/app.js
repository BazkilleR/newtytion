import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { apiRouter } from "./routes/index.js";

/** Builds the Express app without listening, so tests can spin it up on a random port. */
export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", apiRouter);
  app.use("/api", notFoundHandler);
  app.use(errorHandler);

  return app;
}
