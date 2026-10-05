import { DEFAULT_GOALS } from "@fitness/shared";
import { describe, expect, it } from "vitest";
import { createUser } from "../../test/factories.js";
import { getGoals, upsertGoals } from "./goals.service.js";

describe("goals", () => {
  it("defaults until set, then upserts in place", async () => {
    const me = await createUser();
    expect(await getGoals(me.id)).toEqual(DEFAULT_GOALS);

    await upsertGoals(me.id, { kcalTarget: 2200, proteinTargetG: 150 });
    await upsertGoals(me.id, { kcalTarget: 2300, proteinTargetG: 155 });
    expect(await getGoals(me.id)).toEqual({ kcalTarget: 2300, proteinTargetG: 155 });
  });

  it("is per user", async () => {
    const a = await createUser();
    const b = await createUser();
    await upsertGoals(a.id, { kcalTarget: 1800, proteinTargetG: 100 });
    expect(await getGoals(b.id)).toEqual(DEFAULT_GOALS);
  });
});
