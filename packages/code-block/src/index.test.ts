import { describe, expect, it } from "vitest";
import { codeBlockOptions } from "./index.js";

describe("codeBlock", () => {
  it("should exist", () => {
    expect(codeBlockOptions).toBeDefined();
  });
  it("should have defaultLanguage", () => {
    expect(codeBlockOptions.defaultLanguage).toBeDefined();
  });
  it("should have supportedLanguages", () => {
    expect(codeBlockOptions.supportedLanguages).toBeDefined();
  });
  it("should have createHighlighter", () => {
    expect(codeBlockOptions.createHighlighter).toBeDefined();
  });
});
