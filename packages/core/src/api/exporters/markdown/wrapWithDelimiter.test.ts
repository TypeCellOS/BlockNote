// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";
import { wrapWithDelimiter } from "./wrapWithDelimiter.js";

describe.each(["**", "*", "~~"])("wrapWithDelimiter(%s)", (delimiter) => {
  it.each([
    ["word", "", "word", ""],
    [" word", " ", "word", ""],
    ["word ", "", "word", " "],
    [" \tword\t ", " \t", "word", "\t "],
    [" \tfirst\nsecond\t ", " \t", "first\nsecond", "\t "],
    ["\nfirst\nsecond\n", "\n", "first\nsecond", "\n"],
    ["\u00a0word\u00a0", "\u00a0", "word", "\u00a0"],
  ])(
    "wraps %j without styling boundary whitespace",
    (text, leading, content, trailing) => {
      expect(wrapWithDelimiter(text, delimiter)).toBe(
        `${leading}${delimiter}${content}${delimiter}${trailing}`,
      );
    },
  );

  it.each(["", " ", "\t \n\t", "\u00a0"])("leaves %j unwrapped", (text) => {
    expect(wrapWithDelimiter(text, delimiter)).toBe(text);
  });

  it.each(["\\\n", "\\\n \t", "\\\n\\\n"])(
    "preserves terminal hard breaks %j after styled content",
    (breaks) => {
      expect(wrapWithDelimiter(` word ${breaks}`, delimiter) + "next").toBe(
        ` ${delimiter}word${delimiter} ${breaks}next`,
      );
    },
  );

  it("leaves hard-break-only content unwrapped", () => {
    expect(wrapWithDelimiter(" \\\n\\\n\t", delimiter)).toBe(" \\\n\\\n\t");
  });
});
