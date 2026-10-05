import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

function send(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

export function notFoundHandler(req, res) {
  send(res, 404, "NOT_FOUND", `Route ${req.method} ${req.path} not found`);
}

// Express 5 forwards rejected promises from async handlers here automatically,
// so routes can just `throw` — no try/catch or asyncHandler wrapper needed.
// Express recognises an error handler by its 4 parameters, so keep `_next`.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return send(res, err.status, err.code, err.message);
  }

  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
      .join("; ");
    return send(res, 400, "VALIDATION_ERROR", message);
  }

  // Malformed JSON body from express.json()
  if (err?.type === "entity.parse.failed") {
    return send(res, 400, "INVALID_JSON", "Request body is not valid JSON");
  }

  console.error(err);
  send(res, 500, "INTERNAL_ERROR", "Something went wrong");
}
