// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensInlineContent } from "../model.js";
import { mergeInlineContent } from "./inline.js";
import { styledText } from "../testUtil/fixtures.js";

function link(value: string, href: string): LensInlineContent {
  return { type: "link", href, content: [styledText(value)] };
}

const underline = { underline: true };

describe("mergeInlineContent", () => {
  it("keeps styles that the format does not show, also on new text", () => {
    expect(
      mergeInlineContent(
        [styledText("hello world")],
        [styledText("hello brave world")],
        [styledText("hello world", underline)],
      ),
    ).toEqual([styledText("hello brave world", underline)]);
  });

  it("does not give a hidden style to new text at the edge of a styled run", () => {
    const bold = { bold: true };
    expect(
      mergeInlineContent(
        [styledText("first.")],
        [styledText("first, please.")],
        [styledText("first", bold), styledText(".")],
      ),
    ).toEqual([styledText("first", bold), styledText(", please.")]);
  });

  it("gives no hidden style to new text at the end of the content", () => {
    expect(
      mergeInlineContent(
        [styledText("hello")],
        [styledText("hello world")],
        [styledText("hello", underline)],
      ),
    ).toEqual([styledText("hello", underline), styledText(" world")]);
  });

  it("gives the hidden styles of a replaced word to the new word", () => {
    expect(
      mergeInlineContent(
        [styledText("the red car")],
        [styledText("the blue car")],
        [styledText("the "), styledText("red", underline), styledText(" car")],
      ),
    ).toEqual([
      styledText("the "),
      styledText("blue", underline),
      styledText(" car"),
    ]);
  });

  it("keeps the hidden styles of the last word if the text adds words after it", () => {
    expect(
      mergeInlineContent(
        [styledText("Read the manual")],
        [styledText("Read the manual today, and then the guide.")],
        [styledText("Read the "), styledText("manual", underline)],
      ),
    ).toEqual([
      styledText("Read the "),
      styledText("manual", underline),
      styledText(" today, and then the guide."),
    ]);
  });

  it("gives no link to new text after a link at the end of the content", () => {
    expect(
      mergeInlineContent(
        [styledText("See the docs")],
        [styledText("See the docs for all the details.")],
        [styledText("See the "), link("docs", "https://example.com")],
      ),
    ).toEqual([
      styledText("See the "),
      link("docs", "https://example.com"),
      styledText(" for all the details."),
    ]);
  });

  it("applies styles that ours changed", () => {
    expect(
      mergeInlineContent(
        [styledText("hello world")],
        [styledText("hello "), styledText("world", { bold: true })],
        [styledText("hello world", underline)],
      ),
    ).toEqual([
      styledText("hello ", underline),
      styledText("world", { bold: true, underline: true }),
    ]);
  });

  it("removes styles that ours removed", () => {
    expect(
      mergeInlineContent(
        [styledText("hello", { bold: true })],
        [styledText("hello")],
        [styledText("hello", { bold: true, textColor: "red" })],
      ),
    ).toEqual([styledText("hello", { textColor: "red" })]);
  });

  it("keeps the text of theirs where only the round trip changed it", () => {
    // The round trip adds a space after the line break (base). Theirs does
    // not have the space. Ours only adds "!".
    expect(
      mergeInlineContent(
        [styledText("line one\n line two")],
        [styledText("line one\n line two!")],
        [styledText("line one\nline two")],
      ),
    ).toEqual([styledText("line one\nline two!")]);
  });

  // The alignment pairs characters without their styles. Thus, a style
  // change of ours is a change only with the rule `same` of the merge. Else,
  // a change of theirs at the same characters wins without a conflict, and
  // the style change of ours is lost.
  it("keeps a style change of ours over a change of theirs at the same characters (the target stage)", () => {
    const bold = { bold: true };
    expect(
      mergeInlineContent(
        [styledText("ab cd")],
        [styledText("ab "), styledText("cd", bold)],
        [styledText("ab ce")],
      ),
    ).toEqual([styledText("ab "), styledText("cd", bold)]);
  });

  it("reports a conflict for a style change of ours and a change of theirs at the same characters (the document merge)", () => {
    let conflicts = 0;
    mergeInlineContent(
      [styledText("ab cd")],
      [styledText("ab "), styledText("cd", { bold: true })],
      [styledText("ab ce")],
      {
        conflict: { winner: "theirs", onConflict: () => conflicts++ },
        insertsAtOnePosition: "both-theirs-first",
      },
    );
    expect(conflicts).toBe(1);
  });

  it("does not split emoji", () => {
    expect(
      mergeInlineContent(
        [styledText("I 😀")],
        [styledText("I 😁")],
        [styledText("I 😀", underline)],
      ),
    ).toEqual([styledText("I 😁", underline)]);
  });

  it("changes the target of a link", () => {
    expect(
      mergeInlineContent(
        [styledText("see "), link("docs", "https://a.example")],
        [styledText("see "), link("docs", "https://b.example")],
        [styledText("see "), link("docs", "https://a.example")],
      ),
    ).toEqual([styledText("see "), link("docs", "https://b.example")]);
  });

  it("keeps custom inline content", () => {
    const mention: LensInlineContent = {
      type: "mention",
      props: { user: "Ada" },
    };
    expect(
      mergeInlineContent(
        [styledText("Hi "), mention],
        [styledText("Hi there "), mention],
        [styledText("Hi "), mention],
      ),
    ).toEqual([styledText("Hi there "), mention]);
  });
});

describe("mergeInlineContent: links", () => {
  const a = "https://a.example";
  const b = "https://b.example";
  const c = "https://c.example";
  const theirsWins = (onConflict: () => void) => ({
    conflict: { winner: "theirs" as const, onConflict },
    insertsAtOnePosition: "both-theirs-first" as const,
  });

  it("keeps a new URL of theirs if ours did not change the link", () => {
    expect(
      mergeInlineContent(
        [styledText("see "), link("docs", a)],
        [styledText("see "), link("docs", a)],
        [styledText("see "), link("docs", b)],
      ),
    ).toEqual([styledText("see "), link("docs", b)]);
  });

  it("gives the URL of the winner, with a conflict, if the two sides changed the URL", () => {
    const base = [styledText("see "), link("docs", a)];
    const ours = [styledText("see "), link("docs", b)];
    const theirs = [styledText("see "), link("docs", c)];
    expect(mergeInlineContent(base, ours, theirs)).toEqual(ours);
    let conflicts = 0;
    expect(
      mergeInlineContent(
        base,
        ours,
        theirs,
        theirsWins(() => conflicts++),
      ),
    ).toEqual(theirs);
    expect(conflicts).toBeGreaterThan(0);
  });

  it("gives the side of the winner, with a conflict, if one side removed the link and the other changed its URL", () => {
    const base = [styledText("see "), link("docs", a)];
    const removed = [styledText("see docs")];
    const changed = [styledText("see "), link("docs", b)];
    let conflicts = 0;
    expect(
      mergeInlineContent(
        base,
        removed,
        changed,
        theirsWins(() => conflicts++),
      ),
    ).toEqual(changed);
    expect(
      mergeInlineContent(
        base,
        changed,
        removed,
        theirsWins(() => conflicts++),
      ),
    ).toEqual(removed);
    expect(conflicts).toBeGreaterThan(0);
  });

  it("gives the text of ours and the URL of theirs if ours wins conflicts", () => {
    expect(
      mergeInlineContent(
        [styledText("see "), link("docs", a)],
        [styledText("see "), link("guide", a)],
        [styledText("see "), link("docs", b)],
      ),
    ).toEqual([styledText("see "), link("guide", b)]);
  });

  // The merge compares each character together with its link. Thus, a new
  // URL of theirs is a change of each character of the link, and the new
  // link text of ours conflicts with it.
  it("KNOWN LIMIT: loses the new link text of ours, with a conflict, if theirs changed the URL and wins conflicts", () => {
    let conflicts = 0;
    expect(
      mergeInlineContent(
        [styledText("see "), link("docs", a)],
        [styledText("see "), link("guide", a)],
        [styledText("see "), link("docs", b)],
        theirsWins(() => conflicts++),
      ),
    ).toEqual([styledText("see "), link("docs", b)]);
    expect(conflicts).toBe(1);
  });
});
