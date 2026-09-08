import { describe, expect, it } from "vite-plus/test";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test insertBlocks", () => {
  it("Insert empty column list", () => {
    // An empty column list is filled to a valid two-column list (each with an
    // empty paragraph) instead of throwing.
    getEditor().insertBlocks([{ type: "columnList" }], "paragraph-0", "after");

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert column list with empty column", () => {
    // The empty column is padded with a paragraph, and the list is padded to
    // its `min: 2` with a second column, instead of throwing.
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
      "after",
    );

    const list = getEditor().document[1] as any;
    expect(list.type).toBe("columnList");
    expect(list.children).toHaveLength(2);
    expect(list.children[0].children).toHaveLength(1);
    expect(list.children[1].children).toHaveLength(1);
  });

  it("Insert column list with single column", () => {
    // A one-column list is padded up to `min: 2` with a second column,
    // instead of throwing.
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
      "after",
    );

    const list = getEditor().document[1] as any;
    expect(list.type).toBe("columnList");
    expect(list.children).toHaveLength(2);
    expect(list.children[0].children[0].content[0].text).toBe(
      "Inserted Column Paragraph",
    );
    expect(list.children[1].children[0].content).toEqual([]);
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
      "after",
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
      "before",
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
      "after",
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
        "after",
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
        "after",
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
      "after",
    );

    expect(getEditor().document).toMatchSnapshot();
  });
});
