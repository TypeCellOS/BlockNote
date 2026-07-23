import { describe, expect, it } from "vite-plus/test";
import { codeBlockOptions, syntaxHighlighter } from "./index.js";

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
  it("should not configure a highlighter (that's now the syntaxHighlighter extension)", () => {
    expect("createHighlighter" in codeBlockOptions).toBe(false);
  });
  it("should export a pre-configured syntaxHighlighter extension", () => {
    expect(syntaxHighlighter).toBeDefined();
  });
});
