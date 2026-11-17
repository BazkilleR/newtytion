import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { env } from "./env.js";

const original = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in original)) delete process.env[key];
  }
  Object.assign(process.env, original);
});

/** Import env.js afresh with some variables overridden. */
async function loadEnv(overrides) {
  Object.assign(process.env, overrides);
  let mod;
  await jest.isolateModulesAsync(async () => {
    mod = await import("./env.js");
  });
  return mod.env;
}

describe("env (as loaded for the tests)", () => {
  it("keeps variables already in the environment over the .env file", () => {
    // jest.config.js sets these before load-env.js reads the root .env
    expect(env.NODE_ENV).toBe("test");
    expect(env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);
  });

  it("has a numeric port and two different JWT secrets of at least 32 characters", () => {
    expect(Number.isInteger(env.PORT)).toBe(true);
    expect(env.JWT_ACCESS_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.JWT_REFRESH_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.JWT_ACCESS_SECRET).not.toBe(env.JWT_REFRESH_SECRET);
  });
});

describe("env validation", () => {
  it("coerces PORT to a number", async () => {
    expect((await loadEnv({ PORT: "4123" })).PORT).toBe(4123);
  });

  it.each([
    ["a non-numeric PORT", { PORT: "abc" }, "PORT"],
    ["a negative PORT", { PORT: "-1" }, "PORT"],
    ["an unknown NODE_ENV", { NODE_ENV: "staging" }, "NODE_ENV"],
    ["a DATABASE_URL that isn't a URL", { DATABASE_URL: "not a url" }, "DATABASE_URL"],
    ["a short access secret", { JWT_ACCESS_SECRET: "too-short" }, "JWT_ACCESS_SECRET"],
    ["a short refresh secret", { JWT_REFRESH_SECRET: "too-short" }, "JWT_REFRESH_SECRET"],
  ])("fails at startup on %s", async (_label, overrides, key) => {
    await expect(loadEnv(overrides)).rejects.toThrow(key);
  });
});
