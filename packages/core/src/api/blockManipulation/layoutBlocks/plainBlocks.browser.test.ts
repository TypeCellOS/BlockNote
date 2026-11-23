import { expect } from "vite-plus/test";
import { plainNoteContent, schema } from "./plainBlocks.fixture.js";

it("renders and round-trips multiline content with its children", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({
    mountType: "dom",
    schema,
    initialContent: plainNoteContent("First\nSecond"),
  });
  expect(editor.domElement?.querySelector(".plain-frame")?.textContent).toBe(
    "First\nSecondExplanation",
  );
  const parsed = editor.tryParseHTMLToBlocks(
    editor.blocksToFullHTML(editor.document),
  );
  expect(parsed).toEqual(editor.document);
  expect(editor.blocksToHTMLLossy(editor.document)).toContain("Explanation");
});
