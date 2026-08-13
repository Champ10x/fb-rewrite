import { describe, expect, it } from "vitest";
import { countPostsSince, getMonthStart } from "./quota";

describe("getMonthStart", () => {
  it("returns the 1st of the current month when today is mid-month", () => {
    const midMonth = new Date(Date.UTC(2026, 2, 15, 10, 0)); // March 15 2026
    expect(getMonthStart(midMonth).toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("returns the 1st even when today already is the 1st", () => {
    const firstOfMonth = new Date(Date.UTC(2026, 2, 1, 23, 59));
    expect(getMonthStart(firstOfMonth).toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("handles December correctly", () => {
    const december = new Date(Date.UTC(2026, 11, 25, 5, 0));
    expect(getMonthStart(december).toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});

describe("countPostsSince", () => {
  it("counts only timestamps at or after the boundary", () => {
    const since = new Date(Date.UTC(2026, 0, 5, 0, 0));
    const timestamps = [
      "2026-01-04T23:59:59.000Z", // before
      "2026-01-05T00:00:00.000Z", // exactly at boundary
      "2026-01-06T12:00:00.000Z", // after
    ];
    expect(countPostsSince(timestamps, since)).toBe(2);
  });
});
