import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signUp } from "../../test/auth.js";
import { createFood } from "../../test/factories.js";
import { listen } from "../../test/http.js";
import { createApp } from "../app.js";

let server;

beforeAll(async () => {
  server = await listen(createApp());
});

afterAll(async () => {
  await server.close();
});

const json = (cookie, method, body) => ({
  method,
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("meals routes", () => {
  it("ignores a userId in the body and logs to the session user", async () => {
    const alice = await signUp(server.url);
    const bob = await signUp(server.url);
    const food = await createFood(null);

    const res = await fetch(
      `${server.url}/api/meals`,
      json(alice.cookie, "POST", {
        userId: bob.user.id, // attempt to write into Bob's log
        logDate: "2026-10-06",
        mealType: "lunch",
        foodId: food.id,
        quantity: 1,
      }),
    );
    expect(res.status).toBe(201);

    const day = (cookie) =>
      fetch(`${server.url}/api/meals?date=2026-10-06`, { headers: { cookie } }).then((r) =>
        r.json(),
      );
    expect((await day(alice.cookie)).entries).toHaveLength(1);
    expect((await day(bob.cookie)).entries).toHaveLength(0);
  });

  it("returns VALIDATION_ERROR for bad input", async () => {
    const { cookie } = await signUp(server.url);

    const noDate = await fetch(`${server.url}/api/meals`, { headers: { cookie } });
    expect(noDate.status).toBe(400);
    expect((await noDate.json()).error.code).toBe("VALIDATION_ERROR");

    const bad = await fetch(
      `${server.url}/api/meals`,
      json(cookie, "POST", { logDate: "06/10/2026", mealType: "brunch", foodId: "x", quantity: 0 }),
    );
    expect(bad.status).toBe(400);
    const { error } = await bad.json();
    expect(error.message).toContain("logDate");
    expect(error.message).toContain("mealType");
  });

  it("returns 400 for a malformed id instead of a database error", async () => {
    const { cookie } = await signUp(server.url);
    const res = await fetch(`${server.url}/api/meals/not-a-uuid`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(res.status).toBe(400);
  });
});
