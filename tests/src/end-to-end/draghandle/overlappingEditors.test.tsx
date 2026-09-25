import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { DRAG_HANDLE_SELECTOR } from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";
import { moveMouseOverElement } from "../../utils/mouse.js";

function OverlappingEditors() {
  const readOnlyEditor = useCreateBlockNote();
  const editableEditor = useCreateBlockNote();

  return (
    <div style={{ display: "grid" }}>
      <div style={{ gridArea: "1 / 1" }}>
        <BlockNoteView editor={readOnlyEditor} editable={false} />
      </div>
      <div style={{ gridArea: "1 / 1", zIndex: 1 }}>
        <BlockNoteView editor={editableEditor} />
      </div>
    </div>
  );
}

describe("Overlapping editors", () => {
  test("shows the side menu for an editable editor over a read-only editor", async () => {
    await render(<OverlappingEditors />);

    const editableBlock = await waitForSelector(
      '.bn-editor[contenteditable="true"] [data-content-type="paragraph"]',
    );
    await moveMouseOverElement(editableBlock);

    await waitForSelector(DRAG_HANDLE_SELECTOR);
  });
});
