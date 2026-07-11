import { describe, expect, it } from "vitest";
import { displayTokens } from "./tokens";

describe("displayTokens", () => {
  it("returns null when actual is null or undefined", () => {
    expect(displayTokens(null)).toBeNull();
    expect(displayTokens(undefined)).toBeNull();
  });

  it("adds a 50% markup, rounded", () => {
    expect(displayTokens(100)).toBe(150);
    expect(displayTokens(1080)).toBe(1620);
    expect(displayTokens(1)).toBe(2); // 1.5 rounds up
  });

  it("handles zero", () => {
    expect(displayTokens(0)).toBe(0);
  });
});
