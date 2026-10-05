import { randomUUID } from "node:crypto";
import { db } from "../src/db/client.js";
import { foods, user } from "../src/db/schema/index.js";

/** Insert a user row directly (no password) — enough for service tests. */
export async function createUser(overrides = {}) {
  const id = randomUUID();
  const [row] = await db
    .insert(user)
    .values({
      id,
      name: "Test",
      email: `${id}@example.com`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    })
    .returning();
  return row;
}

/** Insert a food. Pass userId = null for a global food. */
export async function createFood(userId, overrides = {}) {
  const [row] = await db
    .insert(foods)
    .values({
      userId,
      name: `Food ${randomUUID().slice(0, 8)}`,
      kcal: 100,
      proteinG: 10,
      carbG: 10,
      fatG: 2,
      servingSize: 1,
      servingUnit: "plate",
      ...overrides,
    })
    .returning();
  return row;
}
