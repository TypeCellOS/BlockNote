import type { BlockNoteEditor } from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { afterEach, describe, expect } from "vite-plus/test";

import type { SetupEditor } from "../../commands/browser/setupEditor.js";
import { waitForSelector } from "../../utils/editor.js";
import { getRect, mouseSequence, startBlockDrag } from "../../utils/mouse.js";

// Two editors stacked on the same grid cell (#2559), e.g. an editor in a
// dialog over another one. The top editor is editable; the bottom one is
// read-only or editable. The side menu and drops must go to the top editor.

async function setupOverlappingEditors(
  setupEditor: SetupEditor,
  bottomEditable: boolean,
  onTestFinished: (callback: () => void) => void,
) {
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.width = "600px";
  document.body.append(grid);
  // Register first so the editor fixtures unmount before the grid is removed.
  onTestFinished(() => grid.remove());

  async function setupPane(name: string, ids: string[], editable: boolean) {
    const result = await setupEditor({
      initialContent: ids.map((id) => ({
        id,
        type: "paragraph" as const,
        content: `${name} ${id}`,
      })),
      props: { editable },
    });
    result.rootNode.dataset.editorName = name;
    result.rootNode.style.gridArea = "1 / 1";
    return result;
  }

  const bottom = await setupPane("bottom", ["u1", "u2", "u3"], bottomEditable);
  const top = await setupPane("top", ["t1", "t2", "t3"], true);
  top.rootNode.style.zIndex = "1";
  top.rootNode.style.background = "white";

  grid.append(bottom.rootNode, top.rootNode);
  return { top: top.editor, bottom: bottom.editor };
}

afterEach(async () => {
  await mouseSequence([{ type: "move", x: 1, y: 1 }]);
});

function menuBlock(editor: BlockNoteEditor): string | undefined {
  const state = editor.getExtension(SideMenuExtension)?.store.state;
  return state?.show ? state.block.id : undefined;
}

function blockContent(name: string, id: string) {
  return document.querySelector<HTMLElement>(
    `[data-editor-name="${name}"] .bn-block[data-id="${id}"] .bn-block-content`,
  )!;
}

for (const bottomEditable of [false, true]) {
  describe(`overlapping editors, bottom editor ${bottomEditable ? "editable" : "read-only"}`, () => {
    it("hover: the top editor shows its menu", async ({
      setupEditor,
      onTestFinished,
    }) => {
      const { top, bottom } = await setupOverlappingEditors(
        setupEditor,
        bottomEditable,
        onTestFinished,
      );
      await waitForSelector(".bn-editor");
      const r = getRect(blockContent("top", "t2"));
      await mouseSequence([
        { type: "move", x: r.x + 30, y: r.y + r.height / 2, steps: 8 },
      ]);
      expect(menuBlock(top)).toBe("t2");
      expect(menuBlock(bottom)).toBeUndefined();
    });

    it("drag and drop: a block of the top editor moves within it", async ({
      setupEditor,
      onTestFinished,
    }) => {
      const { top, bottom } = await setupOverlappingEditors(
        setupEditor,
        bottomEditable,
        onTestFinished,
      );
      await waitForSelector(".bn-editor");
      const source = blockContent("top", "t3");
      const r3 = getRect(source);
      await mouseSequence([
        { type: "move", x: r3.x + 30, y: r3.y + r3.height / 2, steps: 8 },
      ]);
      const target = blockContent("top", "t1");
      const t1 = getRect(target);
      const x = t1.x + 30;
      const y = t1.y + 2;
      await startBlockDrag(source, onTestFinished);
      const dragOverListener = new AbortController();
      try {
        let dragOver: DragEvent | undefined;
        target.addEventListener(
          "dragover",
          (event) => {
            if (
              event.isTrusted &&
              Math.abs(event.clientX - x) <= 1 &&
              Math.abs(event.clientY - y) <= 1
            ) {
              dragOver = event;
            }
          },
          { signal: dragOverListener.signal },
        );
        await mouseSequence([
          { type: "move", x, y, steps: 5 },
          // Some engines need a second move at the destination to emit dragover.
          { type: "move", x, y },
        ]);
        // ProseMirror accepts the native drop by preventing default on dragover.
        await expect.poll(() => dragOver?.defaultPrevented).toBe(true);
        await mouseSequence([{ type: "up" }]);
      } finally {
        dragOverListener.abort();
      }
      await expect
        .poll(() => top.document.map((b) => b.id))
        .toEqual(["t3", "t1", "t2"]);
      expect(bottom.document.map((b) => b.id)).toEqual(["u1", "u2", "u3"]);
    });
  });
}
