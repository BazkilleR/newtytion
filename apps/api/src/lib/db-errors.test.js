import { describe, expect, it } from "@jest/globals";
import { PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION, pgErrorCode } from "./db-errors.js";

describe("pgErrorCode", () => {
  it("reads the code of a raw pg error", () => {
    expect(pgErrorCode({ code: "23505" })).toBe("23505");
  });

  it("reads the code from `cause` when Drizzle wraps the pg error", () => {
    const wrapped = new Error("Failed query", { cause: { code: "23503" } });
    expect(pgErrorCode(wrapped)).toBe("23503");
  });

  it("prefers the error's own code over its cause", () => {
    expect(pgErrorCode({ code: "23505", cause: { code: "23503" } })).toBe("23505");
  });

  it("is undefined for errors without a code, and for null/undefined", () => {
    expect(pgErrorCode(new Error("boom"))).toBeUndefined();
    expect(pgErrorCode(new Error("boom", { cause: new Error("inner") }))).toBeUndefined();
    expect(pgErrorCode(null)).toBeUndefined();
    expect(pgErrorCode(undefined)).toBeUndefined();
  });
});

describe("Postgres error codes", () => {
  it("match the SQLSTATE values", () => {
    expect(PG_FOREIGN_KEY_VIOLATION).toBe("23503");
    expect(PG_UNIQUE_VIOLATION).toBe("23505");
  });
});
