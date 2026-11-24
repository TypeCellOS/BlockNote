import { expect } from "vite-plus/test";
import { layoutSchema } from "./layoutBlocks.fixture.js";

it("flattens layout blocks to their children in markdown export", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({
    mountType: false,
    schema: layoutSchema,
    initialContent: [
      {
        type: "callout",
        id: "c-0",
        children: [
          { id: "c-p-0", type: "paragraph", content: "In callout" },
          { id: "c-p-1", type: "heading", content: "Heading in callout" },
        ],
      },
    ],
  });

  const markdown = editor.blocksToMarkdownLossy(editor.document);

  expect(markdown).toContain("In callout");
  expect(markdown).toContain("# Heading in callout");
});
