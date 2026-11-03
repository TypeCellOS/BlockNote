import { describe, expect, it } from "vite-plus/test";

import type {
  LensInlineContent,
  LensStyledText,
  LensStyles,
} from "../blocks/types.js";
import { mergeInlineContent } from "./inline.js";

function text(value: string, styles: LensStyles = {}): LensStyledText {
  return { type: "text", text: value, styles };
}

function link(value: string, href: string): LensInlineContent {
  return { type: "link", href, content: [text(value)] };
}

const underline = { underline: true };

describe("mergeInlineContent", () => {
  it("keeps styles that the format does not show, also on new text", () => {
    expect(
      mergeInlineContent(
        [text("hello world")],
        [text("hello brave world")],
        [text("hello world", underline)],
      ),
    ).toEqual([text("hello brave world", underline)]);
  });

  it("does not give a hidden style to new text at the edge of a styled run", () => {
    const bold = { bold: true };
    expect(
      mergeInlineContent(
        [text("first.")],
        [text("first, please.")],
        [text("first", bold), text(".")],
      ),
    ).toEqual([text("first", bold), text(", please.")]);
  });

  it("gives no hidden style to new text at the end of the content", () => {
    expect(
      mergeInlineContent(
        [text("hello")],
        [text("hello world")],
        [text("hello", underline)],
      ),
    ).toEqual([text("hello", underline), text(" world")]);
  });

  it("gives the hidden styles of a replaced word to the new word", () => {
    expect(
      mergeInlineContent(
        [text("the red car")],
        [text("the blue car")],
        [text("the "), text("red", underline), text(" car")],
      ),
    ).toEqual([text("the "), text("blue", underline), text(" car")]);
  });

  it("keeps the hidden styles of the last word if the text adds words after it", () => {
    expect(
      mergeInlineContent(
        [text("Read the manual")],
        [text("Read the manual today, and then the guide.")],
        [text("Read the "), text("manual", underline)],
      ),
    ).toEqual([
      text("Read the "),
      text("manual", underline),
      text(" today, and then the guide."),
    ]);
  });

  it("gives no link to new text after a link at the end of the content", () => {
    expect(
      mergeInlineContent(
        [text("See the docs")],
        [text("See the docs for all the details.")],
        [text("See the "), link("docs", "https://example.com")],
      ),
    ).toEqual([
      text("See the "),
      link("docs", "https://example.com"),
      text(" for all the details."),
    ]);
  });

  it("applies styles that ours changed", () => {
    expect(
      mergeInlineContent(
        [text("hello world")],
        [text("hello "), text("world", { bold: true })],
        [text("hello world", underline)],
      ),
    ).toEqual([
      text("hello ", underline),
      text("world", { bold: true, underline: true }),
    ]);
  });

  it("removes styles that ours removed", () => {
    expect(
      mergeInlineContent(
        [text("hello", { bold: true })],
        [text("hello")],
        [text("hello", { bold: true, textColor: "red" })],
      ),
    ).toEqual([text("hello", { textColor: "red" })]);
  });

  it("keeps the text of theirs where only the round trip changed it", () => {
    // The round trip adds a space after the line break (base). Theirs does
    // not have the space. Ours only adds "!".
    expect(
      mergeInlineContent(
        [text("line one\n line two")],
        [text("line one\n line two!")],
        [text("line one\nline two")],
      ),
    ).toEqual([text("line one\nline two!")]);
  });

  it("does not split emoji", () => {
    expect(
      mergeInlineContent(
        [text("I 😀")],
        [text("I 😁")],
        [text("I 😀", underline)],
      ),
    ).toEqual([text("I 😁", underline)]);
  });

  it("changes the target of a link", () => {
    expect(
      mergeInlineContent(
        [text("see "), link("docs", "https://a.example")],
        [text("see "), link("docs", "https://b.example")],
        [text("see "), link("docs", "https://a.example")],
      ),
    ).toEqual([text("see "), link("docs", "https://b.example")]);
  });

  it("keeps custom inline content", () => {
    const mention: LensInlineContent = {
      type: "mention",
      props: { user: "Ada" },
    };
    expect(
      mergeInlineContent(
        [text("Hi "), mention],
        [text("Hi there "), mention],
        [text("Hi "), mention],
      ),
    ).toEqual([text("Hi there "), mention]);
  });
});
