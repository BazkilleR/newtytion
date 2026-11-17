import { describe, expect, it } from "@jest/globals";
import { z } from "zod";
import { fieldErrorsFrom, toNumber } from "./use-form.js";

describe("fieldErrorsFrom", () => {
  it("keeps the first message per field", () => {
    const schema = z.object({
      email: z.email("bad email"),
      password: z.string().min(8, "too short").regex(/\d/, "needs a digit"),
    });
    const result = schema.safeParse({ email: "nope", password: "abc" });
    expect(fieldErrorsFrom(result.error)).toEqual({ email: "bad email", password: "too short" });
  });

  it("puts object-level errors under `form`", () => {
    const schema = z.string().min(1, "required");
    expect(fieldErrorsFrom(schema.safeParse("").error)).toEqual({ form: "required" });
  });
});

describe("toNumber", () => {
  it.each([
    ["12", 12],
    [" 2.5 ", 2.5],
    ["", undefined],
    ["abc", undefined],
    [7, 7],
  ])("%j -> %j", (input, expected) => {
    expect(toNumber(input)).toBe(expected);
  });
});
