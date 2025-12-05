import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

describe("Test replaceBlocks", () => {
  it("Replace paragraph with column list above column list", () => {
    getEditor().replaceBlocks(
      ["paragraph-1"],
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
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace all blocks in column with single block", () => {
    getEditor().replaceBlocks(
      ["column-paragraph-0", "column-paragraph-1"],
      [
        {
          type: "paragraph",
          content: "New Paragraph",
        },
      ],
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace all blocks in columns with single block", () => {
    getEditor().replaceBlocks(
      [
        "column-paragraph-0",
        "column-paragraph-1",
        "column-paragraph-2",
        "column-paragraph-3",
      ],
      [
        {
          type: "paragraph",
          content: "New Paragraph",
        },
      ],
    );

    expect(getEditor().document).toMatchSnapshot();
  });
});
