import { DEFAULT_GOALS } from "@fitness/shared";
import { describe, expect, it } from "vitest";
import { createUser } from "../../test/factories.js";
import { getGoals, upsertGoals } from "./goals.service.js";

describe("goals", () => {
  it("defaults until set, then upserts in place", async () => {
    const me = await createUser();
    expect(await getGoals(me.id)).toEqual(DEFAULT_GOALS);

    await upsertGoals(me.id, {
      kcalTarget: 2200,
      proteinTargetG: 150,
      carbTargetG: 250,
      fatTargetG: 60,
    });
    const updated = { kcalTarget: 2300, proteinTargetG: 155, carbTargetG: 270, fatTargetG: 65 };
    await upsertGoals(me.id, updated);
    expect(await getGoals(me.id)).toEqual(updated);
  });

  it("is per user", async () => {
    const a = await createUser();
    const b = await createUser();
    await upsertGoals(a.id, {
      kcalTarget: 1800,
      proteinTargetG: 100,
      carbTargetG: 200,
      fatTargetG: 50,
    });
    expect(await getGoals(b.id)).toEqual(DEFAULT_GOALS);
  });
});
