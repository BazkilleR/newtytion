import { describe, expect, it } from "@jest/globals";
import { createUser } from "../../test/factories.js";
import { deleteBodyLog, listBodyLogs, upsertBodyLog } from "./body.service.js";

describe("body logs", () => {
  it("upserts one weigh-in per day", async () => {
    const me = await createUser();
    await upsertBodyLog(me.id, "2026-10-06", { weightKg: 72.4 });
    await upsertBodyLog(me.id, "2026-10-06", { weightKg: 72.1 });
    expect(await listBodyLogs(me.id, { from: "2026-10-06", to: "2026-10-06" })).toEqual([
      { logDate: "2026-10-06", weightKg: 72.1, avgKg: 72.1 },
    ]);
  });

  it("averages over the 6 days before `from` too", async () => {
    const me = await createUser();
    // Oct 1..7: 70, 71, ... 76
    for (let d = 1; d <= 7; d++) {
      await upsertBodyLog(me.id, `2026-10-0${d}`, { weightKg: 69 + d });
    }
    const [only] = await listBodyLogs(me.id, { from: "2026-10-07", to: "2026-10-07" });
    expect(only).toEqual({ logDate: "2026-10-07", weightKg: 76, avgKg: 73 });
  });

  it("uses a calendar window, so gaps don't pull in older weigh-ins", async () => {
    const me = await createUser();
    await upsertBodyLog(me.id, "2026-10-01", { weightKg: 70 });
    await upsertBodyLog(me.id, "2026-10-07", { weightKg: 74 });
    await upsertBodyLog(me.id, "2026-10-08", { weightKg: 80 });
    expect(await listBodyLogs(me.id, { from: "2026-10-07", to: "2026-10-08" })).toEqual([
      { logDate: "2026-10-07", weightKg: 74, avgKg: 72 }, // window Oct 1..7
      { logDate: "2026-10-08", weightKg: 80, avgKg: 77 }, // window Oct 2..8: Oct 1 drops out
    ]);
  });

  it("returns the upserted row", async () => {
    const me = await createUser();
    expect(await upsertBodyLog(me.id, "2026-10-06", { weightKg: 72.35 })).toEqual({
      logDate: "2026-10-06",
      weightKg: 72.35,
    });
  });

  it("is scoped to the user and range", async () => {
    const me = await createUser();
    const other = await createUser();
    await upsertBodyLog(me.id, "2026-09-01", { weightKg: 75 });
    await upsertBodyLog(me.id, "2026-11-01", { weightKg: 75 });
    await upsertBodyLog(other.id, "2026-10-05", { weightKg: 90 });
    expect(await listBodyLogs(me.id, { from: "2026-10-01", to: "2026-10-31" })).toEqual([]);
  });

  it("deletes by date, 404 when there is nothing", async () => {
    const me = await createUser();
    await upsertBodyLog(me.id, "2026-10-06", { weightKg: 72 });
    await deleteBodyLog(me.id, "2026-10-06");
    await expect(deleteBodyLog(me.id, "2026-10-06")).rejects.toMatchObject({ status: 404 });
  });

  it("only deletes the user's own weigh-in", async () => {
    const me = await createUser();
    const other = await createUser();
    await upsertBodyLog(other.id, "2026-10-06", { weightKg: 90 });
    await expect(deleteBodyLog(me.id, "2026-10-06")).rejects.toMatchObject({ status: 404 });
    expect(await listBodyLogs(other.id, { from: "2026-10-06", to: "2026-10-06" })).toHaveLength(1);
  });
});
