import { describe, expect, it } from "@jest/globals";
import { dateToTs, evenTicks, formatTick, niceTicks, paddedDomain } from "./chart-utils.js";

describe("chart utils", () => {
  it("converts dates to UTC timestamps and back to labels", () => {
    expect(formatTick(dateToTs("2026-10-06"))).toBe("6 Oct");
  });

  it("spreads day-aligned ticks across the range", () => {
    const ticks = evenTicks(dateToTs("2026-10-01"), dateToTs("2026-10-31"), 4);
    expect(ticks.map(formatTick)).toEqual(["1 Oct", "11 Oct", "21 Oct", "31 Oct"]);
  });

  it("picks round-number y ticks", () => {
    expect(niceTicks([73.5, 77])).toEqual({ domain: [73, 77], ticks: [73, 74, 75, 76, 77] });
    expect(niceTicks([65, 105])).toEqual({ domain: [60, 120], ticks: [60, 80, 100, 120] });
    expect(niceTicks([74, 75])).toEqual({ domain: [74, 75], ticks: [74, 74.25, 74.5, 74.75, 75] });
  });

  it("pads and snaps the y domain", () => {
    expect(paddedDomain([72.3, 74.1])).toEqual([71.5, 75]);
    expect(paddedDomain([80, 92.5], 5, 2.5)).toEqual([75, 95]);
    expect(paddedDomain([])).toEqual([0, 1]);
  });
});
