import { afterEach, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { SideMenuExtension } from "./SideMenu.js";
import { unsetDragImage } from "./dragging.js";

const cleanup: (() => void)[] = [];

afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose());
});

it("restores editor focus when a menu closes in another document", () => {
  const frame = document.createElement("iframe");
  document.body.appendChild(frame);
  cleanup.push(() => frame.remove());
  const ownerDocument = frame.contentDocument!;
  const container = ownerDocument.createElement("div");
  ownerDocument.body.appendChild(container);
  const editor = BlockNoteEditor.create({
    initialContent: [{ type: "paragraph", content: "Target" }],
  });
  editor.mount(container);
  cleanup.push(() => editor._tiptapEditor.destroy());

  expect(ownerDocument.activeElement).toBe(ownerDocument.body);
  editor.getExtension(SideMenuExtension)!.unfreezeMenu();
  expect(ownerDocument.activeElement).toBe(editor.prosemirrorView.dom);
});

it.each([false, true])(
  "does not steal focus from another input (editor UI: %s)",
  (editorUI) => {
    const wrapper = document.createElement("div");
    const container = document.createElement("div");
    const input = document.createElement("input");
    wrapper.appendChild(container);
    document.body.append(wrapper, input);
    cleanup.push(
      () => wrapper.remove(),
      () => input.remove(),
    );
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "paragraph", content: "Target" }],
    });
    editor.mount(container);
    cleanup.push(() => editor._tiptapEditor.destroy());
    if (editorUI) {
      editor.registerPortalElement(input);
      cleanup.push(() => editor.unregisterPortalElement(input));
    }

    input.focus();
    expect(editor.isWithinEditor(input)).toBe(editorUI);
    editor.getExtension(SideMenuExtension)!.unfreezeMenu();
    expect(document.activeElement).toBe(input);
  },
);

it("ends a drag through the public API without blurring the editor", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  cleanup.push(() => container.remove());
  const editor = BlockNoteEditor.create({
    initialContent: [
      { id: "dragged", type: "paragraph", content: "Dragged" },
      { id: "other", type: "paragraph", content: "Other" },
    ],
  });
  editor.mount(container);
  cleanup.push(() => editor._tiptapEditor.destroy());
  const view = editor.prosemirrorView;
  cleanup.push(() => unsetDragImage(view.root));
  const sideMenu = editor.getExtension(SideMenuExtension)!;

  function hover(id: string) {
    const block = view.dom.querySelector(`[data-id="${id}"]`)!;
    const rect = block.getBoundingClientRect();
    block.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        // Do not let the lost-dragend mousemove fallback clean up for the API.
        buttons: 1,
        clientX: rect.left + 5,
        clientY: rect.top + rect.height / 2,
      }),
    );
  }

  editor.focus();
  hover("dragged");
  expect(sideMenu.store.state?.show).toBe(true);
  sideMenu.blockDragStart(
    { dataTransfer: new DataTransfer(), clientY: 0 },
    editor.getBlock("dragged")!,
  );
  expect(document.querySelector(".bn-drag-preview")).not.toBeNull();
  sideMenu.blockDragEnd();
  expect(document.querySelector(".bn-drag-preview")).toBeNull();
  expect(sideMenu.store.state?.show).toBe(false);
  expect(view.root.activeElement).toBe(view.dom);

  // Clearing the drag state allows the menu to follow another block again.
  hover("other");
  expect(sideMenu.store.state?.block.id).toBe("other");
  sideMenu.blockDragEnd();
  expect(view.root.activeElement).toBe(view.dom);
});
