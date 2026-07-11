import { describe, expect, it } from "vitest";
import { countPostsSince, getWeekStart } from "./quota";

describe("getWeekStart", () => {
  it("returns the same Monday when today is Monday", () => {
    const monday = new Date(Date.UTC(2026, 0, 5, 15, 30)); // Jan 5 2026 is a Monday
    expect(getWeekStart(monday).toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });

  it("returns the prior Monday for a Wednesday", () => {
    const wednesday = new Date(Date.UTC(2026, 0, 7, 10, 0));
    expect(getWeekStart(wednesday).toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });

  it("returns the prior Monday for a Sunday (end of week)", () => {
    const sunday = new Date(Date.UTC(2026, 0, 11, 23, 59));
    expect(getWeekStart(sunday).toISOString()).toBe("2026-01-05T00:00:00.000Z");
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
