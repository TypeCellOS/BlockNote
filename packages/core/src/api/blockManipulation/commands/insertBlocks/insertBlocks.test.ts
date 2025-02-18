import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../../setupTestEnv.js";
import { insertBlocks } from "./insertBlocks.js";

const getEditor = setupTestEnv();

describe("Test insertBlocks", () => {
  it("Insert single basic block before (without type)", () => {
    insertBlocks(getEditor(), [{ content: "test" }], "paragraph-0", "before");

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert single basic block before", () => {
    insertBlocks(getEditor(), [{ type: "paragraph" }], "paragraph-0", "before");

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert single basic block after", () => {
    insertBlocks(getEditor(), [{ type: "paragraph" }], "paragraph-0", "after");

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert multiple blocks before", () => {
    insertBlocks(
      getEditor(),
      [
        { type: "paragraph", content: "Inserted paragraph 1" },
        { type: "paragraph", content: "Inserted paragraph 2" },
        { type: "paragraph", content: "Inserted paragraph 3" },
      ],
      "paragraph-0",
      "before"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert multiple blocks after", () => {
    insertBlocks(
      getEditor(),
      [
        { type: "paragraph", content: "Inserted paragraph 1" },
        { type: "paragraph", content: "Inserted paragraph 2" },
        { type: "paragraph", content: "Inserted paragraph 3" },
      ],
      "paragraph-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert single complex block before", () => {
    insertBlocks(
      getEditor(),
      [
        {
          id: "inserted-heading-with-everything",
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
          children: [
            {
              id: "inserted-nested-paragraph-2",
              type: "paragraph",
              content: "Nested Paragraph 2",
              children: [
                {
                  id: "inserted-double-nested-paragraph-2",
                  type: "paragraph",
                  content: "Double Nested Paragraph 2",
                },
              ],
            },
          ],
        },
      ],
      "paragraph-0",
      "before"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert single complex block after", () => {
    insertBlocks(
      getEditor(),
      [
        {
          id: "inserted-heading-with-everything",
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
          children: [
            {
              id: "inserted-nested-paragraph-2",
              type: "paragraph",
              content: "Nested Paragraph 2",
              children: [
                {
                  id: "inserted-double-nested-paragraph-2",
                  type: "paragraph",
                  content: "Double Nested Paragraph 2",
                },
              ],
            },
          ],
        },
      ],
      "paragraph-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });
});
