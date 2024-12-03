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
      ]
    );

    expect(getEditor().document).toMatchSnapshot();
  });
});
