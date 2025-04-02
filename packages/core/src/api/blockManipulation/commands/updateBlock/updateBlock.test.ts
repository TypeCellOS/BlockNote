import { describe, expect, it } from "vitest";

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
        }
      );
    } catch (e) {
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
        }
      );
    } catch (e) {
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
        }
      );
    } catch (e) {
      // ID doesn't exist, which is fine - this is a compile-time check
    }
  });
});

describe("Test updateBlock", () => {
  it.skip("Update ID", () => {
    updateBlock(getEditor(), "heading-with-everything", {
      id: "new-id",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update type", () => {
    updateBlock(getEditor(), "heading-with-everything", {
      type: "paragraph",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update single prop", () => {
    updateBlock(getEditor(), "heading-with-everything", {
      props: {
        level: 3,
      },
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update all props", () => {
    updateBlock(getEditor(), "heading-with-everything", {
      props: {
        backgroundColor: "blue",
        level: 3,
        textAlignment: "right",
        textColor: "blue",
      },
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Revert single prop", () => {
    updateBlock(getEditor(), "heading-with-everything", {
      props: {
        level: undefined,
      },
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Revert all props", () => {
    updateBlock(getEditor(), "heading-with-everything", {
      props: {
        backgroundColor: undefined,
        level: undefined,
        textAlignment: undefined,
        textColor: undefined,
      },
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update with plain content", () => {
    updateBlock(getEditor(), "heading-with-everything", {
      content: "New content",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update with styled content", () => {
    updateBlock(getEditor(), "heading-with-everything", {
      content: [
        { type: "text", text: "New", styles: { backgroundColor: "blue" } },
        { type: "text", text: " ", styles: {} },
        { type: "text", text: "content", styles: { backgroundColor: "blue" } },
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update partial (offset start)", () => {
    const info = getBlockInfo(
      getNodeById("heading-with-everything", getEditor().prosemirrorState.doc)!
    );

    if (!info.isBlockContainer) {
      throw new Error("heading-with-everything is not a block container");
    }

    updateBlock(
      getEditor(),
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
      info.blockContent.beforePos + 9
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update partial (offset start + end)", () => {
    const info = getBlockInfo(
      getNodeById("heading-with-everything", getEditor().prosemirrorState.doc)!
    );

    if (!info.isBlockContainer) {
      throw new Error("heading-with-everything is not a block container");
    }

    updateBlock(
      getEditor(),
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
      info.blockContent.beforePos + 9
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update partial (props + offset end)", () => {
    const info = getBlockInfo(
      getNodeById("heading-with-everything", getEditor().prosemirrorState.doc)!
    );

    if (!info.isBlockContainer) {
      throw new Error("heading-with-everything is not a block container");
    }

    updateBlock(
      getEditor(),
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
      info.blockContent.beforePos + 9
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update partial (table cell)", () => {
    const info = getBlockInfo(
      getNodeById("table-0", getEditor().prosemirrorState.doc)!
    );

    if (!info.isBlockContainer) {
      throw new Error("table-0 is not a block container");
    }

    const cell = info.blockContent.node.resolve(2);

    updateBlock(
      getEditor(),
      "table-0",
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["updated cell 1"] }],
        },
      },
      info.blockContent.beforePos + 2,
      info.blockContent.beforePos + 2 + cell.node().nodeSize
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update partial (table row)", () => {
    const info = getBlockInfo(
      getNodeById("table-0", getEditor().prosemirrorState.doc)!
    );

    if (!info.isBlockContainer) {
      throw new Error("table-0 is not a block container");
    }

    const cell = info.blockContent.node.resolve(1);

    updateBlock(
      getEditor(),
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
      info.blockContent.beforePos + 1 + cell.node().nodeSize
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update children", () => {
    updateBlock(getEditor(), "heading-with-everything", {
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
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it.skip("Update everything", () => {
    updateBlock(getEditor(), "heading-with-everything", {
      id: "new-id",
      type: "paragraph",
      props: {
        backgroundColor: "blue",
        textAlignment: "right",
        textColor: "blue",
      },
      content: [
        { type: "text", text: "New", styles: { backgroundColor: "blue" } },
        { type: "text", text: " ", styles: {} },
        { type: "text", text: "content", styles: { backgroundColor: "blue" } },
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
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update inline content to empty table content", () => {
    expect(() => {
      updateBlock(getEditor(), "paragraph-0", {
        type: "table",
      });
    }).toThrow();
  });

  it("Update table content to empty inline content", () => {
    updateBlock(getEditor(), "table-0", {
      type: "paragraph",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update inline content to table content", () => {
    updateBlock(getEditor(), "paragraph-0", {
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
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update table content to inline content", () => {
    updateBlock(getEditor(), "table-0", {
      type: "paragraph",
      content: "Paragraph",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update inline content to no content", () => {
    updateBlock(getEditor(), "paragraph-0", {
      type: "image",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update no content to empty inline content", () => {
    updateBlock(getEditor(), "image-0", {
      type: "paragraph",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update no content to inline content", () => {
    updateBlock(getEditor(), "image-0", {
      type: "paragraph",
      content: "Paragraph",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update no content to empty table content", () => {
    updateBlock(getEditor(), "image-0", {
      type: "table",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update no content to table content", () => {
    updateBlock(getEditor(), "image-0", {
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
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update table content to no content", () => {
    updateBlock(getEditor(), "table-0", {
      type: "image",
    });

    expect(getEditor().document).toMatchSnapshot();
  });
});
