import { describe, expect, it } from "vitest";
import { getCharCount, getWordCount } from "./text-stats";

describe("getWordCount", () => {
  it("counts words separated by whitespace, including newlines", () => {
    expect(getWordCount("hello world")).toBe(2);
    expect(getWordCount("hello\n\nworld\nagain")).toBe(3);
  });

  it("returns 0 for empty, null, or whitespace-only text", () => {
    expect(getWordCount("")).toBe(0);
    expect(getWordCount(null)).toBe(0);
    expect(getWordCount(undefined)).toBe(0);
    expect(getWordCount("   \n  ")).toBe(0);
  });
});

describe("getCharCount", () => {
  it("returns the string length", () => {
    expect(getCharCount("hello")).toBe(5);
    expect(getCharCount("a\n\nb")).toBe(4);
  });

  it("returns 0 for null or undefined", () => {
    expect(getCharCount(null)).toBe(0);
    expect(getCharCount(undefined)).toBe(0);
  });
});
