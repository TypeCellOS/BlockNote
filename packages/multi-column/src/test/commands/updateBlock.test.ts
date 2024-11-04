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
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column list new empty children", () => {
    getEditor().updateBlock("column-list-0", {
      type: "columnList",
      children: [
        {
          type: "column",
        },
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
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
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column to column list", () => {
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
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
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
    getEditor().updateBlock("column-list-0", {
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

  it("Update column list to paragraph", () => {
    getEditor().updateBlock("column-list-0", {
      type: "paragraph",
      content: "Inserted Column Paragraph",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column to paragraph", () => {
    getEditor().updateBlock("column-0", {
      type: "paragraph",
      content: "Inserted Column Paragraph",
    });

    expect(getEditor().document).toMatchSnapshot();
  });
});
