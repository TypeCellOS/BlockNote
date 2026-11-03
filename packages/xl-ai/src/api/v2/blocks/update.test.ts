import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "./types.js";
import { diffBlock, patchBlock } from "./update.js";

const block: LensBlock = {
  id: "a",
  type: "paragraph",
  props: { textColor: "red", textAlignment: "left" },
  content: [{ type: "text", text: "Hello", styles: {} }],
  children: [],
};

describe("diffBlock", () => {
  it("returns undefined for an equal block", () => {
    expect(diffBlock(block, block)).toBeUndefined();
  });

  it("returns only the changed props and the changed content", () => {
    const content = [{ type: "text" as const, text: "Hi", styles: {} }];
    expect(
      diffBlock(block, {
        type: "paragraph",
        props: { textColor: "blue", textAlignment: "left" },
        content,
      }),
    ).toEqual({ props: { textColor: "blue" }, content });
  });

  it("returns all props and the content for a new type", () => {
    // The content is equal in Block JSON, but a new type can store it in a
    // different way (for example a line end in a code block).
    expect(
      diffBlock(block, {
        type: "heading",
        props: { level: 2, textColor: "red" },
        content: block.content,
      }),
    ).toEqual({
      type: "heading",
      props: { level: 2, textColor: "red" },
      content: block.content,
    });
  });
});

describe("patchBlock", () => {
  it("applies an update that diffBlock made", () => {
    const target = {
      type: "paragraph",
      props: { textColor: "blue", textAlignment: "left" },
      content: [],
    };
    const update = diffBlock(block, target);
    if (update === undefined) {
      throw new Error("Expected an update");
    }
    expect(patchBlock(block, update)).toEqual({ ...block, ...target });
  });

  it("replaces all props for a new type", () => {
    expect(
      patchBlock(block, { type: "heading", props: { level: 1 } }).props,
    ).toEqual({ level: 1 });
  });

  it("sets content to undefined if the update says so", () => {
    expect(
      patchBlock(block, { type: "divider", props: {}, content: undefined })
        .content,
    ).toBeUndefined();
  });
});
