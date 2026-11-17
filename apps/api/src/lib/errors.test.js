import { describe, expect, it } from "@jest/globals";
import { AppError, conflict, forbidden, notFound, unauthorized } from "./errors.js";

describe("AppError", () => {
  it("is an Error carrying an HTTP status and a machine-readable code", () => {
    const err = new AppError(418, "TEAPOT", "I'm a teapot");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({
      name: "AppError",
      status: 418,
      code: "TEAPOT",
      message: "I'm a teapot",
    });
    expect(err.stack).toEqual(expect.any(String));
  });
});

describe("error helpers", () => {
  it("notFound names the missing thing", () => {
    expect(notFound("Food")).toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: "Food not found",
    });
  });

  it("forbidden has a default message that can be overridden", () => {
    expect(forbidden()).toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "You cannot modify this resource",
    });
    expect(forbidden("Nope").message).toBe("Nope");
  });

  it("conflict takes its own code", () => {
    expect(conflict("EMAIL_TAKEN", "Taken")).toMatchObject({
      status: 409,
      code: "EMAIL_TAKEN",
      message: "Taken",
    });
  });

  it("unauthorized has a default message that can be overridden", () => {
    expect(unauthorized()).toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
      message: "You need to log in",
    });
    expect(unauthorized("Session expired").message).toBe("Session expired");
  });

  it("returns a fresh error every call", () => {
    expect(notFound("A")).not.toBe(notFound("A"));
    expect(notFound("A")).toBeInstanceOf(AppError);
  });
});
