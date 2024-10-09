import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";
import { updateBlock } from "./updateBlock.js";

const getEditor = setupTestEnv();

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

  it("Update inline content to table content", () => {
    updateBlock(getEditor(), "paragraph-0", {
      type: "table",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update table content to inline content", () => {
    updateBlock(getEditor(), "table-0", {
      type: "paragraph",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update inline content to no content", () => {
    updateBlock(getEditor(), "paragraph-0", {
      type: "image",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update no content to inline content", () => {
    updateBlock(getEditor(), "image-0", {
      type: "paragraph",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update no content to table content", () => {
    updateBlock(getEditor(), "image-0", {
      type: "table",
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
