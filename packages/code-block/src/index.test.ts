import { describe, expect, it } from "vite-plus/test";
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
});
