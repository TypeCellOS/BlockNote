import { describe, expect } from "vite-plus/test";
import { useSelectedBlocks } from "./useSelectedBlocks.js";

function SelectedBlockIds() {
  const blocks = useSelectedBlocks();
  return (
    <output aria-label="Selected blocks">
      {JSON.stringify(blocks.map((block) => block.id))}
    </output>
  );
}

describe("useSelectedBlocks", () => {
  it("reports no selected blocks while the cursor is between images", async ({
    setupEditor,
    page,
    pressKey,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [
        { id: "intro", type: "paragraph", content: "Intro" },
        { id: "upper", type: "image" },
        { id: "lower", type: "image" },
        { id: "outro", type: "paragraph", content: "Outro" },
      ],
      props: { formattingToolbar: false },
      children: <SelectedBlockIds />,
    });
    const selectedBlocks = page.getByRole("status", {
      name: "Selected blocks",
    });
    editor.setTextCursorPosition("intro", "end");
    editor.focus();

    await expect.element(selectedBlocks).toHaveTextContent('["intro"]');

    await pressKey("ArrowDown");
    await expect.element(selectedBlocks).toHaveTextContent('["upper"]');

    await pressKey("ArrowDown");
    await expect.element(selectedBlocks).toHaveTextContent("[]");
    expect(editor.getTextCursorPosition()).toBeDefined();

    await pressKey("ArrowDown");
    await expect.element(selectedBlocks).toHaveTextContent('["lower"]');

    editor.setSelection("intro", "outro");
    await expect
      .element(selectedBlocks)
      .toHaveTextContent('["intro","upper","lower","outro"]');
  });
});
