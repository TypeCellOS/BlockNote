import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test insertBlocks", () => {
  it("Insert empty column list", () => {
    // should throw an error as we don't allow empty column lists
    expect(() => {
      getEditor().insertBlocks(
        [{ type: "columnList" }],
        "paragraph-0",
        "after"
      );
    }).toThrow();
  });

  it("Insert column list with empty column", () => {
    // should throw an error as we don't allow empty columns
    expect(() => {
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
    }).toThrow();
  });

  it("Insert column list with single column", () => {
    // should throw an error as we don't allow column list with single column
    expect(() => {
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
    }).toThrow();
  });

  it("Insert valid column list with two columns", () => {
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
            {
              type: "column",
              children: [
                {
                  type: "paragraph",
                  content: "Inserted Second Column Paragraph",
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

  // TODO: failing because prosemirror "insert" finds a place to insert this using the fitting algorithm
  it.skip("Insert column into paragraph", () => {
    // should throw an error as we don't allow columns to be children of paragraphs
    expect(() => {
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
    }).toThrow();
  });

  // TODO: failing because prosemirror "insert" finds a place to insert this using the fitting algorithm
  it.skip("Insert paragraph into column list", () => {
    // should throw an error as we don't allow paragraphs to be children of column lists
    expect(() => {
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
    }).toThrow();
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
