// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensInlineContent } from "../model.js";
import { mergeInlineContent } from "./inline.js";

const text = (value: string, styles = {}): LensInlineContent => ({
  type: "text",
  text: value,
  styles,
});

function mention(user: string): LensInlineContent {
  return { type: "mention", props: { user } };
}

/** Markdown shows a mention as "@" and the user. */
function shadowOf(item: LensInlineContent) {
  return item.type === "mention" && "props" in item
    ? `@${String(item.props.user)}`
    : undefined;
}

/** A merge of the target stage: base is the view, ours is the text, theirs is the document. */
function target(
  view: string,
  textOfClient: string,
  document: LensInlineContent[],
) {
  return mergeInlineContent([text(view)], [text(textOfClient)], document, {
    conflict: { winner: "ours" },
    insertsAtOnePosition: "conflict",
    changeUnit: "character",
    hiddenItems: { shadowOf },
  });
}

describe("mergeInlineContent: shadows of the target stage", () => {
  const document = [text("Hi "), mention("Bob"), text("!")];

  it("gives the document if the text did not change", () => {
    expect(target("Hi @Bob!", "Hi @Bob!", document)).toEqual(document);
  });

  it("keeps the item if the text keeps all characters of its shadow", () => {
    expect(target("Hi @Bob!", "Hi @Bob, hello!", document)).toEqual([
      text("Hi "),
      mention("Bob"),
      text(", hello!"),
    ]);
  });

  it("removes the item if the text removes its shadow", () => {
    expect(target("Hi @Bob!", "Hi !", document)).toEqual([text("Hi !")]);
  });

  it("replaces the item with text if the text changes its shadow", () => {
    expect(target("Hi @Bob!", "Hi @Bo!", document)).toEqual([text("Hi @Bo!")]);
  });

  it("keeps one of two equal items if the text removes the shadow of the other", () => {
    const two = [mention("Bob"), text(" and "), mention("Bob")];
    expect(target("@Bob and @Bob", "@Bob", two)).toEqual([mention("Bob")]);
  });

  it("keeps an item with a shadow with a space in it", () => {
    const withSpace = [text("Hi "), mention("Bob Smith"), text("!")];
    expect(target("Hi @Bob Smith!", "Hi @Bob Smith!", withSpace)).toEqual(
      withSpace,
    );
    expect(target("Hi @Bob Smith!", "Hello @Bob Smith!", withSpace)).toEqual([
      text("Hello "),
      mention("Bob Smith"),
      text("!"),
    ]);
  });

  it("keeps an item without a shadow (an atom) that the view does not show", () => {
    const hidden: LensInlineContent = { type: "hidden", props: {} };
    expect(
      mergeInlineContent(
        [text("a b")],
        [text("a c")],
        [text("a "), hidden, text("b")],
        {
          conflict: { winner: "ours" },
          insertsAtOnePosition: "conflict",
          changeUnit: "character",
          hiddenItems: { shadowOf },
        },
      ),
    ).toEqual([text("a "), hidden, text("c")]);
  });
});

describe("mergeInlineContent: edge cases", () => {
  it("merges three empty contents to an empty content", () => {
    expect(mergeInlineContent([], [], [])).toEqual([]);
  });

  it("gives the text of ours if base and theirs are empty", () => {
    expect(mergeInlineContent([], [text("new")], [])).toEqual([text("new")]);
  });

  it("gives no hidden style to new text in an empty content", () => {
    expect(
      mergeInlineContent(
        [text("")],
        [text("new")],
        [text("", { underline: true })],
      ),
    ).toEqual([text("new")]);
  });

  it("keeps a whitespace change of theirs, and the change of ours at another place", () => {
    // In the target stage, only theirs changed the double space (the round
    // trip): theirs wins there.
    expect(
      mergeInlineContent([text("a b c")], [text("a b X")], [text("a  b c")]),
    ).toEqual([text("a  b X")]);
  });
});
