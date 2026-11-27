import { describe, expect } from "vite-plus/test";

import { BlockNoteSchema } from "../../../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../../../blocks/defaultBlocks.js";
import { createBlockSpec } from "../../../../schema/index.js";

// A block that leaves itself out of the external HTML.
function createOmittedBlock<const Type extends string>(type: Type) {
  return createBlockSpec(
    { type, propSchema: {}, content: "none" },
    {
      render: () => ({ dom: document.createElement("div") }),
      toExternalHTML: () => null,
    },
  )();
}

function parseHTML(html: string) {
  const dom = document.createElement("div");
  dom.innerHTML = html;
  return dom;
}

describe("a block that exports as nothing", () => {
  // The serializer puts a child list of a list item into the item before it.
  // The item before a block that is left out is not the item of that block.
  it("keeps its child list out of the list item before it", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      schema: BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          omitted: createOmittedBlock("omitted"),
        },
      }),
    });

    const dom = parseHTML(
      editor.blocksToHTMLLossy([
        { type: "bulletListItem", content: "A" },
        {
          type: "omitted",
          children: [{ type: "bulletListItem", content: "B" }],
        },
      ]),
    );

    expect(
      Array.from(dom.querySelectorAll("li"), (item) => item.textContent),
    ).toEqual(["A", "B"]);
    expect(dom.querySelector("li li")).toBeNull();
  });

  // A list item type that is left out made an empty list, and the child list
  // had no item to go into.
  it("is not an item of a list, and its child list follows", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      schema: BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          bulletListItem: createOmittedBlock("bulletListItem"),
        },
      }),
    });

    const dom = parseHTML(
      editor.blocksToHTMLLossy([
        {
          type: "bulletListItem",
          children: [{ type: "numberedListItem", content: "B" }],
        },
      ]),
    );

    expect(dom.querySelector("ul")).toBeNull();
    expect(
      Array.from(dom.querySelectorAll("ol > li"), (item) => item.textContent),
    ).toEqual(["B"]);
  });
});
