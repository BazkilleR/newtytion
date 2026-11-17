import { describe, expect, it } from "@jest/globals";
import { hashPassword, verifyPassword } from "./password.js";

// Made by Better Auth 1.7 for "demo-password", before the switch to JWT.
const BETTER_AUTH_HASH =
  "9fb6dabfa397fe87d8290e8d0c86b752:3183705f46b34a9e0b6bd855a35c7a306632855d75519b911d83a7ad5f0532aa24623104e25b8efd643418d9763d09f7bcae5d0cc0902885993132d65644beb7";

describe("password", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct-horse");
    expect(hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(await verifyPassword(hash, "correct-horse")).toBe(true);
    expect(await verifyPassword(hash, "wrong-horse")).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("still accepts passwords hashed by Better Auth", async () => {
    expect(await verifyPassword(BETTER_AUTH_HASH, "demo-password")).toBe(true);
    expect(await verifyPassword(BETTER_AUTH_HASH, "demo-passw0rd")).toBe(false);
  });

  it("returns false for a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("unusable", "anything")).toBe(false);
  });
});
