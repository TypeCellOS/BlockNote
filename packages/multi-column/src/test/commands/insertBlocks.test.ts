import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test insertBlocks", () => {
  it("Insert empty column list", () => {
    getEditor().insertBlocks([{ type: "columnList" }], "paragraph-0", "after");

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert column list with empty column", () => {
    getEditor().insertBlocks(
      [
        {
          type: "columnList",
          children: [
            {
              type: "column",
            },
          ],
        },
      ],
      "paragraph-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert column list with paragraph", () => {
    getEditor().insertBlocks(
      [
        {
          type: "columnList",
          children: [
            {
              type: "column",
              children: [
                {
                  type: "paragraph",
                  content: "Inserted Column Paragraph",
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

  it("Insert empty column into column list", () => {
    getEditor().insertBlocks(
      [
        {
          type: "column",
        },
      ],
      "column-0",
      "before"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert column with paragraph into column list", () => {
    getEditor().insertBlocks(
      [
        {
          type: "column",
          children: [
            {
              type: "paragraph",
              content: "Inserted Column Paragraph",
            },
          ],
        },
      ],
      "column-0",
      "before"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert column list into paragraph", () => {
    getEditor().insertBlocks(
      [
        {
          type: "columnList",
          children: [
            {
              type: "column",
              children: [
                {
                  type: "paragraph",
                  content: "Inserted Column Paragraph",
                },
              ],
            },
          ],
        },
      ],
      "nested-paragraph-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert column into paragraph", () => {
    getEditor().insertBlocks(
      [
        {
          type: "column",
          children: [
            {
              type: "paragraph",
              content: "Inserted Column Paragraph",
            },
          ],
        },
      ],
      "nested-paragraph-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert paragraph into column list", () => {
    getEditor().insertBlocks(
      [
        {
          type: "paragraph",
          content: "Inserted Column List Paragraph",
        },
      ],
      "column-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert paragraph into column", () => {
    getEditor().insertBlocks(
      [
        {
          type: "paragraph",
          content: "Inserted Column List Paragraph",
        },
      ],
      "column-paragraph-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });
});
