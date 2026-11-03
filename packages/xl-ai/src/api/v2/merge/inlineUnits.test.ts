import { describe, expect, it } from "vite-plus/test";

import type { LensInlineContent } from "../blocks/types.js";
import { alignUnits, fromUnits, toUnits } from "./inlineUnits.js";

const content: LensInlineContent[] = [
  { type: "text", text: "Hi ", styles: {} },
  { type: "text", text: "😀", styles: { bold: true } },
  {
    type: "link",
    href: "https://example.com",
    content: [{ type: "text", text: "link", styles: {} }],
  },
  { type: "mention", props: { user: "Ada" } },
];

describe("toUnits", () => {
  it("makes one unit for each code point and one for each custom item", () => {
    const units = toUnits(content);
    expect(units).toHaveLength(3 + 1 + 4 + 1);
    expect(units[3]).toEqual({
      kind: "char",
      char: "😀",
      styles: { bold: true },
      href: undefined,
    });
    expect(units[4]).toMatchObject({ href: "https://example.com" });
    expect(units.at(-1)).toMatchObject({ kind: "atom" });
  });
});

describe("fromUnits", () => {
  it("is the inverse of toUnits", () => {
    expect(fromUnits(toUnits(content))).toEqual(content);
  });

  it("gives back an item from its shadow, but not if its characters got a style", () => {
    const mention = {
      type: "mention",
      props: { user: "Bob" },
      content: undefined,
    } as LensInlineContent;
    const units = toUnits([mention], () => "@Bob");
    expect(fromUnits(units)).toEqual([mention]);

    const bold = units.map((unit) =>
      unit.kind === "char" ? { ...unit, styles: { bold: true } } : unit,
    );
    expect(fromUnits(bold)).toEqual([
      { type: "text", text: "@Bob", styles: { bold: true } },
    ]);
  });

  it("joins adjacent text with equal styles", () => {
    expect(
      fromUnits(
        toUnits([
          { type: "text", text: "a", styles: { bold: true } },
          { type: "text", text: "b", styles: { bold: true } },
        ]),
      ),
    ).toEqual([{ type: "text", text: "ab", styles: { bold: true } }]);
  });
});

describe("alignUnits", () => {
  function align(a: string, b: string) {
    return alignUnits(
      toUnits([{ type: "text", text: a, styles: {} }]),
      toUnits([{ type: "text", text: b, styles: { bold: true } }]),
    ).length;
  }

  it("does not compare styles", () => {
    expect(align("hello world", "hello world")).toBe(11);
  });

  it("matches the characters of a word with a small change", () => {
    // "helo" -> "hello": the token changed, but the characters match.
    expect(align("helo world", "hello world")).toBe(10);
  });

  it("does not match characters that are the same only by chance", () => {
    // A token includes the whitespace after it, thus a single space does not
    // match. "sat" and "ran" have only "a" in common, which is not enough.
    expect(align("cat sat", "dog ran")).toBe(0);
  });
});
