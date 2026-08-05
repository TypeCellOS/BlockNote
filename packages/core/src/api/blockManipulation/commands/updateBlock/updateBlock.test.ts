import { describe, expect, it } from "vite-plus/test";

import type { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { getBlockInfo } from "../../../getBlockInfoFromPos.js";
import { getNodeById } from "../../../nodeUtil.js";
import { setupTestEnv } from "../../setupTestEnv.js";
import { updateBlock } from "./updateBlock.js";

const getEditor = setupTestEnv();

describe("Test updateBlock typing", () => {
  it("Type is inferred correctly", () => {
    try {
      getEditor().updateBlock(
        { id: "placeholder-id" },
        {
          // @ts-expect-error invalid type
          type: "non-existing",
        },
      );
    } catch {
      // ID doesn't exist, which is fine - this is a compile-time check
    }
  });

  it("Props are inferred correctly", () => {
    try {
      getEditor().updateBlock(
        { id: "placeholder-id" },
        {
          type: "paragraph",
          props: {
            // @ts-expect-error invalid type
            level: 1,
          },
        },
      );
    } catch {
      // ID doesn't exist, which is fine - this is a compile-time check
    }
    try {
      getEditor().updateBlock(
        { id: "placeholder-id" },
        {
          type: "heading",
          props: {
            level: 1,
          },
        },
      );
    } catch {
      // ID doesn't exist, which is fine - this is a compile-time check
    }
  });
});

describe("Test updateBlock", () => {
  it.skip("Update ID", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "heading-with-everything", {
          id: "new-id",
        }),
      ),
    ).toMatchSnapshot();
    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update type", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "heading-with-everything", {
          type: "paragraph",
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update single prop", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "heading-with-everything", {
          props: {
            level: 3,
          },
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update all props", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "heading-with-everything", {
          props: {
            backgroundColor: "blue",
            level: 3,
            textAlignment: "right",
            textColor: "blue",
          },
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Revert single prop", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "heading-with-everything", {
          props: {
            level: undefined,
          },
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Revert all props", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "heading-with-everything", {
          props: {
            backgroundColor: undefined,
            level: undefined,
            textAlignment: undefined,
            textColor: undefined,
          },
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update with plain content", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "heading-with-everything", {
          content: "New content",
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update with styled content", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "heading-with-everything", {
          content: [
            {
              type: "text",
              text: "New",
              styles: { backgroundColor: "blue" },
            },
            { type: "text", text: " ", styles: {} },
            {
              type: "text",
              text: "content",
              styles: { backgroundColor: "blue" },
            },
          ],
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update partial (offset start)", () => {
    const info = getBlockInfo(
      getNodeById("heading-with-everything", getEditor().prosemirrorState.doc)!,
    );

    if (!info.isBlockContainer) {
      throw new Error("heading-with-everything is not a block container");
    }

    getEditor().transact((tr) =>
      updateBlock(
        tr,
        "heading-with-everything",
        {
          content: [
            {
              type: "text",
              text: "without styles",
              styles: {},
            },
          ],
        },
        info.blockContent.beforePos + 9,
      ),
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update partial (offset start + end)", () => {
    const info = getBlockInfo(
      getNodeById("heading-with-everything", getEditor().prosemirrorState.doc)!,
    );

    if (!info.isBlockContainer) {
      throw new Error("heading-with-everything is not a block container");
    }

    getEditor().transact((tr) =>
      updateBlock(
        tr,
        "heading-with-everything",
        {
          content: [
            {
              type: "text",
              text: "without styles and ",
              styles: {},
            },
          ],
        },
        info.blockContent.beforePos + 9,
        info.blockContent.beforePos + 9,
      ),
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update partial (props + offset end)", () => {
    const info = getBlockInfo(
      getNodeById("heading-with-everything", getEditor().prosemirrorState.doc)!,
    );

    if (!info.isBlockContainer) {
      throw new Error("heading-with-everything is not a block container");
    }

    getEditor().transact((tr) => {
      updateBlock(
        tr,
        "heading-with-everything",
        {
          props: {
            level: 1,
          },
          content: [
            {
              type: "text",
              text: "Title",
              styles: {},
            },
          ],
        },
        undefined,
        info.blockContent.beforePos + 8,
      );
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update partial (table cell)", () => {
    const info = getBlockInfo(
      getNodeById("table-0", getEditor().prosemirrorState.doc)!,
    );

    if (!info.isBlockContainer) {
      throw new Error("table-0 is not a block container");
    }

    const cell = info.blockContent.node.resolve(2);

    getEditor().transact((tr) =>
      updateBlock(
        tr,
        "table-0",
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: ["updated cell 1"] }],
          },
        },
        info.blockContent.beforePos + 2,
        info.blockContent.beforePos + 2 + cell.node().nodeSize,
      ),
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update partial (table row)", () => {
    const info = getBlockInfo(
      getNodeById("table-0", getEditor().prosemirrorState.doc)!,
    );

    if (!info.isBlockContainer) {
      throw new Error("table-0 is not a block container");
    }

    const cell = info.blockContent.node.resolve(1);

    getEditor().transact((tr) =>
      updateBlock(
        tr,
        "table-0",
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: ["updated cell 1", "updated cell 2", "updated cell 3"],
              },
            ],
          },
        },
        info.blockContent.beforePos + 1,
        info.blockContent.beforePos + 1 + cell.node().nodeSize,
      ),
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update children", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "heading-with-everything", {
          children: [
            {
              id: "new-nested-paragraph",
              type: "paragraph",
              content: "New nested Paragraph 2",
              children: [
                {
                  id: "new-double-nested-paragraph",
                  type: "paragraph",
                  content: "New double Nested Paragraph 2",
                },
              ],
            },
          ],
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it.skip("Update everything", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "heading-with-everything", {
          id: "new-id",
          type: "paragraph",
          props: {
            backgroundColor: "blue",
            textAlignment: "right",
            textColor: "blue",
          },
          content: [
            {
              type: "text",
              text: "New",
              styles: { backgroundColor: "blue" },
            },
            { type: "text", text: " ", styles: {} },
            {
              type: "text",
              text: "content",
              styles: { backgroundColor: "blue" },
            },
          ],
          children: [
            {
              id: "new-nested-paragraph",
              type: "paragraph",
              content: "New nested Paragraph 2",
              children: [
                {
                  id: "new-double-nested-paragraph",
                  type: "paragraph",
                  content: "New double Nested Paragraph 2",
                },
              ],
            },
          ],
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update inline content to empty table content", () => {
    expect(() => {
      getEditor().transact((tr) =>
        updateBlock(tr, "paragraph-0", {
          type: "table",
        }),
      );
    }).toThrow();
  });

  it("Update table content to empty inline content", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "table-0", {
          type: "paragraph",
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update inline content to table content", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "paragraph-0", {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: ["Cell 1", "Cell 2", "Cell 3"],
              },
              {
                cells: ["Cell 4", "Cell 5", "Cell 6"],
              },
              {
                cells: ["Cell 7", "Cell 8", "Cell 9"],
              },
            ],
          },
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update table content to inline content", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "table-0", {
          type: "paragraph",
          content: "Paragraph",
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update inline content to no content", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "paragraph-0", {
          type: "image",
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update no content to empty inline content", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "image-0", {
          type: "paragraph",
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update no content to inline content", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "image-0", {
          type: "paragraph",
          content: "Paragraph",
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update no content to empty table content", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "image-0", {
          type: "table",
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update no content to table content", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "image-0", {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Cell 1"],
                  },
                  {
                    type: "tableCell",
                    content: ["Cell 2"],
                    props: {
                      backgroundColor: "red",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "right",
                      textColor: "red",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Cell 3"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: ["Cell 4", "Cell 5", "Cell 6"],
              },
              {
                cells: ["Cell 7", "Cell 8", "Cell 9"],
              },
            ],
          },
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update table content to no content", () => {
    expect(
      getEditor().transact((tr) =>
        updateBlock(tr, "table-0", {
          type: "image",
        }),
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });
});

/**
 * These tests assert that `updateBlock` produces the smallest possible set of
 * ProseMirror steps, rather than replacing whole blocks/content/children when
 * only a small part changed.
 */
describe("Test updateBlock minimal steps", () => {
  // Runs `updateBlock` in a throwaway transaction and returns the resulting
  // steps as JSON for inspection.
  const getSteps = (blockId: string, update: PartialBlock<any, any, any>) => {
    let steps: any[] = [];
    getEditor().transact((tr) => {
      updateBlock(tr, blockId, update);
      steps = tr.steps.map((s) => s.toJSON());
    });
    return steps;
  };

  it("Changing a single prop emits only attr steps", () => {
    const steps = getSteps("heading-with-everything", {
      props: { level: 3 },
    });

    expect(steps).toEqual([
      {
        stepType: "attr",
        pos: expect.any(Number),
        attr: "level",
        value: 3,
      },
    ]);
  });

  it("Changing only children does not touch content or container", () => {
    const steps = getSteps("heading-with-everything", {
      children: [
        {
          id: "new-nested-paragraph",
          type: "paragraph",
          content: "New nested Paragraph 2",
        },
      ],
    });

    // A single replace step covering the children range only.
    expect(steps).toHaveLength(1);
    expect(steps[0].stepType).toBe("replace");
  });

  it("Appending a child is a pure insertion", () => {
    const steps = getSteps("heading-with-everything", {
      children: [
        // Existing child, kept as-is.
        {
          id: "nested-paragraph-1",
          type: "paragraph",
          content: "Nested Paragraph 1",
          children: [
            {
              id: "double-nested-paragraph-1",
              type: "paragraph",
              content: "Double Nested Paragraph 1",
            },
          ],
        },
        // New sibling.
        {
          id: "appended-child",
          type: "paragraph",
          content: "Appended",
        },
      ],
    });

    expect(steps).toHaveLength(1);
    expect(steps[0].stepType).toBe("replace");
    // Pure insertion: from === to (nothing deleted).
    expect(steps[0].from).toBe(steps[0].to);

    expect(
      (getEditor().getBlock("heading-with-everything") as any).children.map(
        (c: any) => c.id,
      ),
    ).toEqual(["nested-paragraph-1", "appended-child"]);
  });

  it("Changing part of the content only replaces the changed range", () => {
    // Original content: "Heading" + " with styled " + "content".
    // Only the middle text changes.
    const steps = getSteps("heading-with-everything", {
      content: [
        { type: "text", text: "Heading", styles: { bold: true } },
        { type: "text", text: " with NEW ", styles: {} },
        { type: "text", text: "content", styles: { italic: true } },
      ],
    });

    expect(steps).toHaveLength(1);
    const [step] = steps;
    expect(step.stepType).toBe("replace");
    // The replaced range should be the diff ("styled" -> "NEW"), much smaller
    // than the whole content node.
    expect(step.to - step.from).toBeLessThan(
      "Heading with styled content".length,
    );
    // Only the changed text is inserted.
    expect(step.slice.content[0].text).toBe("NEW");
  });

  it("Changing one table cell only replaces that cell's text", () => {
    const steps = getSteps("table-0", {
      type: "table",
      content: {
        type: "tableContent",
        rows: [
          { cells: ["Cell 1", "Cell 2", "Cell 3"] },
          { cells: ["Cell 4", "CHANGED", "Cell 6"] },
          { cells: ["Cell 7", "Cell 8", "Cell 9"] },
        ],
      },
    });

    expect(steps).toHaveLength(1);
    expect(steps[0].stepType).toBe("replace");

    const block = getEditor().getBlock("table-0") as any;
    expect(block.content.rows[1].cells[1].content[0].text).toBe("CHANGED");
    // Surrounding cells are untouched.
    expect(block.content.rows[0].cells[0].content[0].text).toBe("Cell 1");
    expect(block.content.rows[2].cells[2].content[0].text).toBe("Cell 9");
  });

  it("Updating with identical content/props/children emits no steps", () => {
    const steps = getSteps("heading-with-everything", {
      type: "heading",
      props: {
        backgroundColor: "red",
        level: 2,
        textAlignment: "center",
        textColor: "red",
      },
      content: [
        { type: "text", text: "Heading", styles: { bold: true } },
        { type: "text", text: " with styled ", styles: {} },
        { type: "text", text: "content", styles: { italic: true } },
      ],
    });

    expect(steps).toEqual([]);
  });

  it("Changing only a child's content replaces just that child's text", () => {
    const steps = getSteps("paragraph-with-children", {
      children: [
        {
          id: "nested-paragraph-0",
          type: "paragraph",
          content: "CHANGED nested",
          children: [
            {
              id: "double-nested-paragraph-0",
              type: "paragraph",
              content: "Double Nested Paragraph 0",
            },
          ],
        },
      ],
    });

    // Diffed down to a single replace; the unchanged double-nested child and
    // surrounding structure are left in place.
    expect(steps).toHaveLength(1);
    expect(steps[0].stepType).toBe("replace");

    const block = getEditor().getBlock("paragraph-with-children") as any;
    expect(block.children[0].content[0].text).toBe("CHANGED nested");
    expect(block.children[0].children[0].id).toBe("double-nested-paragraph-0");
    expect(block.children[0].children[0].content[0].text).toBe(
      "Double Nested Paragraph 0",
    );
  });

  it("Removing a table row only replaces the removed range", () => {
    const steps = getSteps("table-0", {
      type: "table",
      content: {
        type: "tableContent",
        rows: [
          { cells: ["Cell 1", "Cell 2", "Cell 3"] },
          { cells: ["Cell 7", "Cell 8", "Cell 9"] },
        ],
      },
    });

    // Snapped to the removed (middle) row: a single replace where content is
    // deleted (slice is empty -> from < to).
    expect(steps).toHaveLength(1);
    expect(steps[0].stepType).toBe("replace");
    expect(steps[0].to).toBeGreaterThan(steps[0].from);

    const block = getEditor().getBlock("table-0") as any;
    expect(block.content.rows).toHaveLength(2);
    expect(block.content.rows[0].cells[0].content[0].text).toBe("Cell 1");
    expect(block.content.rows[1].cells[2].content[0].text).toBe("Cell 9");
  });

  // Regression: when the content node's TYPE changes, setNodeMarkupMinimal
  // emits a ReplaceAroundStep. Mapping the original beforePos through that step
  // with the default (forward) bias pushes the position past the node, so the
  // subsequent content diff resolved into the wrong place and corrupted the doc.
  // The position must be mapped with a -1 (before) bias.
  it("Type change + content change keeps the document valid", () => {
    const steps = getSteps("paragraph-3", {
      type: "heading",
      props: { level: 1 },
      content: "Now a heading",
    });

    // The type change requires a ReplaceAroundStep, but no error should be
    // thrown and the resulting block must be correct.
    expect(steps.length).toBeGreaterThan(0);

    const block = getEditor().getBlock("paragraph-3") as any;
    expect(block.type).toBe("heading");
    expect(block.props.level).toBe(1);
    expect(block.content[0].text).toBe("Now a heading");

    // The editor document must still be internally consistent.
    expect(() => getEditor()._tiptapEditor.state.doc.check()).not.toThrow();
  });

  it("Type change followed by another update resolves positions correctly", () => {
    const editor = getEditor();

    // First: change the content-node type (forces a ReplaceAroundStep), which
    // is the operation that previously left later positions stale.
    editor.transact((tr) => {
      updateBlock(tr, "paragraph-4", {
        type: "heading",
        props: { level: 2 },
        content: "Heading four",
      });
    });

    // Then: a follow-up update on a *later* block, whose position would be wrong
    // if the first transaction had corrupted the doc length.
    expect(() => {
      editor.transact((tr) => {
        updateBlock(tr, "paragraph-9", {
          content: "Paragraph nine updated",
        });
      });
    }).not.toThrow();

    expect((editor.getBlock("paragraph-4") as any).type).toBe("heading");
    expect((editor.getBlock("paragraph-9") as any).content[0].text).toBe(
      "Paragraph nine updated",
    );
    expect(() => editor._tiptapEditor.state.doc.check()).not.toThrow();
  });

  // Strongest regression: a children change (adds a step BEFORE the content
  // node is updated) combined with a content-node type change (ReplaceAroundStep)
  // and a content change. This is the exact mix that left the original beforePos
  // stale; without the -1 mapping bias the content diff resolves into the wrong
  // place and corrupts/throws.
  it("Children change + type change + content change stays valid", () => {
    const editor = getEditor();

    expect(() => {
      editor.transact((tr) => {
        updateBlock(tr, "paragraph-with-children", {
          type: "heading",
          props: { level: 2 },
          content: "Converted to heading",
          children: [
            {
              id: "nested-paragraph-0",
              type: "paragraph",
              content: "Updated nested",
            },
            {
              id: "brand-new-child",
              type: "paragraph",
              content: "Brand new child",
            },
          ],
        });
      });
    }).not.toThrow();

    const block = editor.getBlock("paragraph-with-children") as any;
    expect(block.type).toBe("heading");
    expect(block.props.level).toBe(2);
    expect(block.content[0].text).toBe("Converted to heading");
    expect(block.children.map((c: any) => c.id)).toEqual([
      "nested-paragraph-0",
      "brand-new-child",
    ]);
    expect(block.children[0].content[0].text).toBe("Updated nested");
    expect(() => editor._tiptapEditor.state.doc.check()).not.toThrow();

    // A follow-up update on a later block must still resolve correctly.
    expect(() => {
      editor.transact((tr) => {
        updateBlock(tr, "paragraph-9", { content: "After conversion" });
      });
    }).not.toThrow();
    expect((editor.getBlock("paragraph-9") as any).content[0].text).toBe(
      "After conversion",
    );
  });

  it("Type change with offset content replace stays minimal and valid", () => {
    const editor = getEditor();
    const info = getBlockInfo(
      getNodeById(
        "paragraph-with-styled-content",
        editor.prosemirrorState.doc,
      )!,
    );
    if (!info.isBlockContainer) {
      throw new Error("paragraph-with-styled-content is not a block container");
    }

    // paragraph-with-styled-content is "Paragraph"(bold) + " with styled " +
    // "content"(italic). Replace only the unstyled middle node while converting
    // the block to a heading. The type change forces a ReplaceAroundStep, after
    // which the offset-replace branch must still resolve the (now shifted)
    // content position correctly.
    let steps: any[] = [];
    editor.transact((tr) => {
      updateBlock(
        tr,
        "paragraph-with-styled-content",
        {
          type: "heading",
          props: { level: 3 },
          content: [{ type: "text", text: " with NEW ", styles: {} }],
        },
        info.blockContent.beforePos + 1 + "Paragraph".length,
        info.blockContent.beforePos + 1 + "Paragraph with styled ".length,
      );
      steps = tr.steps.map((s) => s.toJSON());
    });

    expect(steps.length).toBeGreaterThan(0);

    const block = editor.getBlock("paragraph-with-styled-content") as any;
    expect(block.type).toBe("heading");
    expect(block.props.level).toBe(3);
    // The styled text on either side of the replaced range is preserved.
    expect(block.content[0].text).toBe("Paragraph");
    expect(block.content[block.content.length - 1].text).toBe("content");
    expect(() => editor._tiptapEditor.state.doc.check()).not.toThrow();
  });
});
