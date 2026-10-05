/**
 * Errors that are safe to show to the client. Services throw these; the
 * central error handler turns them into `{ error: { code, message } }`.
 */
export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export const notFound = (what) => new AppError(404, "NOT_FOUND", `${what} not found`);

export const forbidden = (message = "You cannot modify this resource") =>
  new AppError(403, "FORBIDDEN", message);

export const conflict = (code, message) => new AppError(409, code, message);
