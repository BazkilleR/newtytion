/**
 * Errors that are safe to show to the client. Services throw these; the
 * central error handler turns them into `{ error: { code, message } }`.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what: string) => new AppError(404, "NOT_FOUND", `${what} not found`);

export const forbidden = (message = "You cannot modify this resource") =>
  new AppError(403, "FORBIDDEN", message);

export const conflict = (code: string, message: string) => new AppError(409, code, message);
