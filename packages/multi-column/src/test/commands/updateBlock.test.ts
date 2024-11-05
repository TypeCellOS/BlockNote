import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test updateBlock", () => {
  it("Update column list new children", () => {
    getEditor().updateBlock("column-list-0", {
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
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column list new empty children", () => {
    // should throw because we don't allow empty columns / single columns
    expect(() => {
      getEditor().updateBlock("column-list-0", {
        type: "columnList",
        children: [
          {
            type: "paragraph",
            content: "Inserted Column Paragraph",
          },
        ],
      });
    }).toThrow();
  });

  it("Update column new children", () => {
    getEditor().updateBlock("column-0", {
      type: "column",
      children: [
        {
          type: "paragraph",
          content: "Inserted Column Paragraph",
        },
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update paragraph to column list", () => {
    getEditor().updateBlock("paragraph-0", {
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
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update nested paragraph to column list", () => {
    getEditor().updateBlock("nested-paragraph-0", {
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
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column to column list", () => {
    // should throw an error as we don't allow a column list inside a columnlist
    expect(() => {
      getEditor().updateBlock("column-0", {
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
      });
    }).toThrow();
  });

  it("Update paragraph to column", () => {
    getEditor().updateBlock("paragraph-0", {
      type: "column",
      children: [
        {
          type: "paragraph",
          content: "Inserted Column Paragraph",
        },
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update nested paragraph to column", () => {
    getEditor().updateBlock("nested-paragraph-0", {
      type: "column",
      children: [
        {
          type: "paragraph",
          content: "Inserted Column Paragraph",
        },
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column list to column", () => {
    // this would cause a column to become a child of a node that's not a column list, and should thus throw an error
    expect(() => {
      getEditor().updateBlock("column-list-0", {
        type: "column",
        children: [
          {
            type: "paragraph",
            content: "Inserted Column Paragraph",
          },
        ],
      });
    }).toThrow();
  });

  it("Update column list to paragraph", () => {
    // this would cause columns to become children of a paragraph, and should thus throw an error
    expect(() => {
      getEditor().updateBlock("column-list-0", {
        type: "paragraph",
        content: "Inserted Column Paragraph",
      });
    }).toThrow();
  });

  // TODO: this should throw, but currently doesn't, probably because of the fitting algorithm
  it.skip("Update column to paragraph", () => {
    expect(() => {
      getEditor().updateBlock("column-0", {
        type: "paragraph",
        content: "Inserted Column Paragraph",
      });
    }).toThrow();
  });
});
