import { describe, expect, it } from "vitest";
import { scoreColor } from "./scoring";

describe("scoreColor", () => {
  it("returns gray for null/undefined scores", () => {
    expect(scoreColor(null)).toBe("gray");
    expect(scoreColor(undefined)).toBe("gray");
  });

  it("returns red below 50", () => {
    expect(scoreColor(0)).toBe("red");
    expect(scoreColor(30)).toBe("red");
    expect(scoreColor(49)).toBe("red");
  });

  it("returns amber between 50 and 74", () => {
    expect(scoreColor(50)).toBe("amber");
    expect(scoreColor(65)).toBe("amber");
    expect(scoreColor(74)).toBe("amber");
  });

  it("returns green at 75 and above", () => {
    expect(scoreColor(75)).toBe("green");
    expect(scoreColor(82)).toBe("green");
    expect(scoreColor(100)).toBe("green");
  });
});
