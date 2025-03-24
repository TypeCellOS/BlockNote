import { describe, expect, it } from "vitest";
import { codeBlock } from "./index.js";

describe("codeBlock", () => {
  it("should exist", () => {
    expect(codeBlock).toBeDefined();
  });
  it("should have defaultLanguage", () => {
    expect(codeBlock.defaultLanguage).toBeDefined();
  });
  it("should have supportedLanguages", () => {
    expect(codeBlock.supportedLanguages).toBeDefined();
  });
  it("should have createHighlighter", () => {
    expect(codeBlock.createHighlighter).toBeDefined();
  });
});
