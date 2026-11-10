// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { BlockFields } from "../../model.js";
import { deepEqual } from "./json.js";
import { diffBlock } from "./update.js";

function fields(
  props: Record<string, unknown>,
  type = "paragraph",
  text = "Hello",
): BlockFields {
  return {
    type,
    props,
    content: [{ type: "text", text, styles: {} }],
  };
}

describe("diffBlock: edge cases", () => {
  it("gives a prop with the value `undefined` in the target as a change", () => {
    expect(
      diffBlock(fields({ textColor: "red" }), fields({ textColor: undefined })),
    ).toEqual({ props: { textColor: undefined } });
  });

  it("gives no update for a prop that is `undefined` in the block and not in the target", () => {
    expect(
      diffBlock(fields({ textColor: undefined }), fields({})),
    ).toBeUndefined();
  });

  // Before the fix, a prop that the block has and the target does not have
  // was not in the update, and the prop stayed. No public path gives such
  // blocks now (the stored form has each prop of the type), but the tree
  // merge (`mergeRecords`) can drop a key with the value `undefined`.
  it("gives the value `undefined` for a prop that the target does not have", () => {
    const block = fields({ textColor: "red", textAlignment: "left" });
    const target = fields({ textAlignment: "left" });
    expect(deepEqual(block, target)).toBe(false);
    expect(diffBlock(block, target)).toEqual({
      props: { textColor: undefined },
    });
  });

  it("gives the content for a block without content that gets content", () => {
    expect(
      diffBlock(
        { type: "image", props: {}, content: undefined },
        { type: "image", props: {}, content: [] },
      ),
    ).toEqual({ content: [] });
  });

  it("gives no update for two blocks without content", () => {
    expect(
      diffBlock(
        { type: "image", props: { url: "a" }, content: undefined },
        { type: "image", props: { url: "a" }, content: undefined },
      ),
    ).toBeUndefined();
  });
});
