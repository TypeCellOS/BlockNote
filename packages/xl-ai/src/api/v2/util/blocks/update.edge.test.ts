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

  // BUG: a prop that the block has and the target does not have is not in
  // the update. The doc comment says "or `undefined` if they are equal", but
  // the fields are not equal (`deepEqual` gives false), and the result is
  // `undefined`. Thus, the prop stays. Severity: none through the public
  // API now: the blocks of each side are in the stored form, which has each
  // prop of the type. The tree merge (`mergeRecords`) can drop a key with
  // the value `undefined`, thus a later change can expose this.
  it.fails("gives an update if the target does not have a prop of the block", () => {
    const block = fields({ textColor: "red", textAlignment: "left" });
    const target = fields({ textAlignment: "left" });
    expect(deepEqual(block, target)).toBe(false);
    expect(diffBlock(block, target)).not.toBeUndefined();
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
