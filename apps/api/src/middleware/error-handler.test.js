import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { z } from "zod";
import { AppError, notFound } from "../lib/errors.js";
import { errorHandler, notFoundHandler } from "./error-handler.js";

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const next = () => {
  throw new Error("errorHandler must not call next");
};

/** Run the handler and return what it sent. */
function handle(err) {
  const res = mockRes();
  errorHandler(err, {}, res, next);
  expect(res.status).toHaveBeenCalledTimes(1);
  expect(res.json).toHaveBeenCalledTimes(1);
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

describe("errorHandler", () => {
  let consoleError;
  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleError.mockRestore();
  });

  it("is a 4-argument function, so Express treats it as an error handler", () => {
    expect(errorHandler).toHaveLength(4);
  });

  it("sends an AppError's status, code and message", () => {
    expect(handle(notFound("Workout"))).toEqual({
      status: 404,
      body: { error: { code: "NOT_FOUND", message: "Workout not found" } },
    });
    expect(handle(new AppError(409, "SET_CONFLICT", "Try again")).status).toBe(409);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("turns a ZodError into a 400 listing every issue with its path", () => {
    const schema = z.object({
      name: z.string().min(1, "Enter a name"),
      sets: z.array(z.object({ reps: z.number({ error: "Enter a number" }) })),
    });
    const { error } = schema.safeParse({ name: "", sets: [{ reps: "x" }] });

    expect(handle(error)).toEqual({
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "name: Enter a name; sets.0.reps: Enter a number",
        },
      },
    });
  });

  it("shows only the message for a ZodError issue without a path", () => {
    const { error } = z
      .string()
      .refine(() => false, "Bad value")
      .safeParse("x");
    expect(handle(error).body.error.message).toBe("Bad value");
  });

  it("answers malformed JSON from express.json() with INVALID_JSON", () => {
    const err = Object.assign(new SyntaxError("Unexpected token"), {
      type: "entity.parse.failed",
      status: 400,
    });
    expect(handle(err)).toEqual({
      status: 400,
      body: { error: { code: "INVALID_JSON", message: "Request body is not valid JSON" } },
    });
  });

  it("answers a body over the size limit with 413 PAYLOAD_TOO_LARGE, without logging", () => {
    const err = Object.assign(new Error("request entity too large"), {
      type: "entity.too.large",
      status: 413,
    });
    expect(handle(err)).toEqual({
      status: 413,
      body: { error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" } },
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("hides unexpected errors behind a generic 500 and logs them", () => {
    const err = new Error('relation "secret_table" does not exist');
    expect(handle(err)).toEqual({
      status: 500,
      body: { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
    });
    expect(consoleError).toHaveBeenCalledWith(err);
  });

  it("copes with a thrown non-Error value", () => {
    expect(handle(undefined).status).toBe(500);
    expect(handle("string").status).toBe(500);
  });
});

describe("notFoundHandler", () => {
  it("names the method and the full path, including where it is mounted", () => {
    const res = mockRes();
    notFoundHandler({ method: "PATCH", baseUrl: "/api", path: "/nope" }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "NOT_FOUND", message: "Route PATCH /api/nope not found" },
    });
  });
});
