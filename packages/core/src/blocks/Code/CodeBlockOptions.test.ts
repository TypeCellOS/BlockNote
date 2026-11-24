import { describe, expect, it } from "vite-plus/test";

import { getLanguageId, type CodeBlockOptions } from "./CodeBlockOptions.js";
describe("getLanguageId", () => {
  const options: CodeBlockOptions = {
    supportedLanguages: {
      typescript: {
        name: "TypeScript",
        aliases: ["ts", "typescript"],
      },
      javascript: {
        name: "JavaScript",
        aliases: ["js", "javascript"],
      },
      python: {
        name: "Python",
        aliases: ["py", "python"],
      },
    },
  };

  it("resolves alias to language id", () => {
    expect(getLanguageId(options, "ts")).toBe("typescript");
    expect(getLanguageId(options, "js")).toBe("javascript");
    expect(getLanguageId(options, "py")).toBe("python");
  });

  it("resolves language id directly", () => {
    expect(getLanguageId(options, "typescript")).toBe("typescript");
    expect(getLanguageId(options, "javascript")).toBe("javascript");
  });

  it("returns undefined for unknown language", () => {
    expect(getLanguageId(options, "unknown")).toBeUndefined();
  });

  it("returns undefined with no supportedLanguages", () => {
    expect(getLanguageId({}, "ts")).toBeUndefined();
  });
});
