/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vite-plus/test";

import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { BlockNoteSchema } from "./BlockNoteSchema.js";
import { createHeadingBlockSpec } from "./Heading/block.js";
import { defaultBlockSpecs } from "./defaultBlocks.js";
import { getDefaultBlockTypeItems } from "./defaultBlockTypeItems.js";

/** The items for a schema whose heading is `heading`. */
function items(heading = createHeadingBlockSpec()) {
  const schema = BlockNoteSchema.create({
    blockSpecs: { ...defaultBlockSpecs, heading },
  });
  // Only the schema is read.
  return getDefaultBlockTypeItems({ schema } as unknown as BlockNoteEditor);
}

describe("getDefaultBlockTypeItems", () => {
  it("offers every default block type, in the block type select's order", () => {
    expect(items().map((item) => item.key)).toEqual([
      "paragraph",
      "heading",
      "heading_2",
      "heading_3",
      "heading_4",
      "heading_5",
      "heading_6",
      "toggle_heading",
      "toggle_heading_2",
      "toggle_heading_3",
      "quote",
      "toggle_list",
      "bullet_list",
      "numbered_list",
      "check_list",
    ]);
  });

  it("makes a regular heading turn a toggle heading into a regular one (BLO-959)", () => {
    expect(items().find((item) => item.key === "heading_2")?.props).toEqual({
      level: 2,
      isToggleable: false,
    });
  });

  it("offers regular headings when toggle headings are disabled (BLO-1236)", () => {
    const offered = items(
      createHeadingBlockSpec({ allowToggleHeadings: false }),
    );
    expect(offered.filter((item) => item.type === "heading")).toEqual([
      { key: "heading", type: "heading", props: { level: 1 } },
      { key: "heading_2", type: "heading", props: { level: 2 } },
      { key: "heading_3", type: "heading", props: { level: 3 } },
      { key: "heading_4", type: "heading", props: { level: 4 } },
      { key: "heading_5", type: "heading", props: { level: 5 } },
      { key: "heading_6", type: "heading", props: { level: 6 } },
    ]);
  });

  it("offers only the configured heading levels (BLO-990)", () => {
    expect(
      items(createHeadingBlockSpec({ levels: [2, 4] }))
        .filter((item) => item.type === "heading")
        .map((item) => item.key),
    ).toEqual(["heading_2", "heading_4", "toggle_heading_2"]);
  });
});
