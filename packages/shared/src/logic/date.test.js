import { describe, expect, it } from "@jest/globals";
import { addDays, daysBetween, todayIn, toLocalDate } from "./date.js";

describe("toLocalDate", () => {
  it("puts a late-night Bangkok entry on the Bangkok day, not the UTC day", () => {
    // 23:30 in Bangkok (UTC+7) on Oct 6 is 16:30 UTC on Oct 6
    expect(toLocalDate(new Date("2026-10-06T16:30:00Z"), "Asia/Bangkok")).toBe("2026-10-06");
    // 00:30 in Bangkok on Oct 7 is still Oct 6 in UTC
    expect(toLocalDate(new Date("2026-10-06T17:30:00Z"), "Asia/Bangkok")).toBe("2026-10-07");
  });

  it("defaults to Asia/Bangkok", () => {
    expect(toLocalDate(new Date("2026-12-31T17:00:00Z"))).toBe("2027-01-01");
  });

  it("works for other timezones", () => {
    expect(toLocalDate(new Date("2026-10-06T02:00:00Z"), "America/New_York")).toBe("2026-10-05");
  });
});

describe("todayIn", () => {
  it("uses the injected clock", () => {
    expect(todayIn("Asia/Bangkok", new Date("2026-10-06T20:00:00Z"))).toBe("2026-10-07");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("rejects malformed input", () => {
    expect(() => addDays("2026/10/06", 1)).toThrow(RangeError);
  });
});

describe("daysBetween", () => {
  it("counts calendar days", () => {
    expect(daysBetween("2026-10-01", "2026-10-07")).toBe(6);
    expect(daysBetween("2026-10-07", "2026-10-01")).toBe(-6);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
});
