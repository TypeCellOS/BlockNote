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
});
