import { describe, expect, it } from "vite-plus/test";

import type { ContentKind, LensBlock } from "../blocks/types.js";
import { mergeBlock } from "./block.js";

const contentKinds: Record<string, ContentKind> = {
  paragraph: "inline",
  heading: "inline",
  bulletListItem: "inline",
  toggleListItem: "inline",
  codeBlock: "plain",
  image: "none",
  table: "table",
};

function contentKindOf(type: string): ContentKind {
  return contentKinds[type];
}

function block(
  type: string,
  props: Record<string, unknown>,
  content: LensBlock["content"],
): LensBlock {
  return { id: "", type, props, content, children: [] };
}

const text = (value: string, styles = {}) => [
  { type: "text" as const, text: value, styles },
];

describe("mergeBlock", () => {
  it("keeps the type of theirs if ours did not change the type", () => {
    // Markdown shows a toggle list item as a bullet list item.
    const merged = mergeBlock(
      block("bulletListItem", {}, text("Toggle")),
      block("bulletListItem", {}, text("Toggle, edited")),
      block("toggleListItem", {}, text("Toggle")),
      contentKindOf,
    );
    expect(merged.type).toBe("toggleListItem");
    expect(merged.content).toEqual(text("Toggle, edited"));
  });

  it("changes the type and keeps the props that the new type also has", () => {
    const merged = mergeBlock(
      block("heading", { level: 2, textColor: "default" }, text("Title")),
      block("paragraph", { textColor: "default" }, text("Title")),
      block("heading", { level: 2, textColor: "red" }, text("Title")),
      contentKindOf,
    );
    expect(merged).toEqual({
      type: "paragraph",
      props: { textColor: "red" },
      content: text("Title"),
    });
  });

  it("merges each prop", () => {
    const merged = mergeBlock(
      block("heading", { level: 2, textColor: "default" }, text("Title")),
      block("heading", { level: 3, textColor: "default" }, text("Title")),
      block("heading", { level: 2, textColor: "red" }, text("Title")),
      contentKindOf,
    );
    expect(merged.props).toEqual({ level: 3, textColor: "red" });
  });

  it("keeps all props of theirs if ours has no props", () => {
    // Plain text gives blocks without props.
    const merged = mergeBlock(
      block("paragraph", {}, text("a")),
      block("paragraph", {}, text("b")),
      block("paragraph", { textAlignment: "center" }, text("a")),
      contentKindOf,
    );
    expect(merged.props).toEqual({ textAlignment: "center" });
  });

  it("removes styles from plain content", () => {
    const merged = mergeBlock(
      block("paragraph", {}, text("code")),
      block("codeBlock", {}, text("code")),
      block("paragraph", {}, text("code", { underline: true })),
      contentKindOf,
    );
    expect(merged.content).toEqual(text("code"));
  });

  it("keeps the content of theirs as one item if the content did not change", () => {
    const theirContent = text("a", { underline: true });
    const merged = mergeBlock(
      block("paragraph", { textColor: "default" }, text("a")),
      block("paragraph", { textColor: "blue" }, text("a")),
      block("paragraph", { textColor: "default" }, theirContent),
      contentKindOf,
    );
    expect(merged.content).toBe(theirContent);
  });

  it("gives no content for a block type without content", () => {
    const merged = mergeBlock(
      block("image", { caption: "a" }, undefined),
      block("image", { caption: "b" }, undefined),
      block("image", { caption: "a", previewWidth: 300 }, undefined),
      contentKindOf,
    );
    expect(merged).toEqual({
      type: "image",
      props: { caption: "b", previewWidth: 300 },
      content: undefined,
    });
  });
});
