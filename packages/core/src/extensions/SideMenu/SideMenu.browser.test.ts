import { afterEach, expect, vi } from "vite-plus/test";

import { SideMenuExtension } from "./SideMenu.js";
import { MultipleNodeSelection } from "./MultipleNodeSelection.js";
import { getNodeById } from "../../api/nodeUtil.js";
import { unsetDragImage } from "./dragging.js";

const cleanup: (() => void)[] = [];

it("drags only the child when its parent has a single-block selection", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({
    mountType: "dom",
    initialContent: [
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
    ],
  });
  cleanup.push(() => unsetDragImage(editor.domElement!.ownerDocument));
  editor.transact((tr) => {
    const parent = getNodeById("parent", tr.doc)!;
    tr.setSelection(
      MultipleNodeSelection.create(
        tr.doc,
        parent.posBeforeNode,
        parent.posBeforeNode + parent.node.nodeSize,
      ),
    );
  });
  editor
    .getExtension(SideMenuExtension)!
    .blockDragStart(
      { dataTransfer: new DataTransfer(), clientY: 0 },
      editor.getBlock("child")!,
    );
  editor.transact((tr) => {
    expect(tr.selection).toBeInstanceOf(MultipleNodeSelection);
    expect(tr.selection.content().content.firstChild?.attrs.id).toBe("child");
  });
});

afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose());
});

it("restores editor focus when a menu closes in another document", async ({
  setupEditor,
}) => {
  const frame = document.createElement("iframe");
  document.body.appendChild(frame);
  cleanup.push(() => frame.remove());
  const ownerDocument = frame.contentDocument!;
  const container = ownerDocument.createElement("div");
  ownerDocument.body.appendChild(container);
  const { editor } = await setupEditor({
    mountType: false,
    initialContent: [{ type: "paragraph", content: "Target" }],
  });
  editor.mount(container);

  expect(ownerDocument.activeElement).toBe(ownerDocument.body);
  editor.getExtension(SideMenuExtension)!.unfreezeMenu();
  expect(ownerDocument.activeElement).toBe(editor.domElement);
});

it.for([false, true])(
  "does not steal focus from another input (editor UI: %s)",
  async (editorUI, { setupEditor }) => {
    const wrapper = document.createElement("div");
    const container = document.createElement("div");
    const input = document.createElement("input");
    wrapper.appendChild(container);
    document.body.append(wrapper, input);
    cleanup.push(
      () => wrapper.remove(),
      () => input.remove(),
    );
    const { editor } = await setupEditor({
      mountType: false,
      initialContent: [{ type: "paragraph", content: "Target" }],
    });
    editor.mount(container);
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

it("ends a drag through the public API without blurring the editor", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({
    mountType: "dom",
    initialContent: [
      { id: "dragged", type: "paragraph", content: "Dragged" },
      { id: "other", type: "paragraph", content: "Other" },
    ],
  });
  const editable = editor.domElement!;
  cleanup.push(() => unsetDragImage(editable.ownerDocument));
  const sideMenu = editor.getExtension(SideMenuExtension)!;

  function hover(id: string) {
    const block = editable.querySelector(`[data-id="${id}"]`)!;
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
  expect(editable.ownerDocument.activeElement).toBe(editable);

  // Clearing the drag state allows the menu to follow another block again.
  hover("other");
  expect(sideMenu.store.state?.block.id).toBe("other");
  sideMenu.blockDragEnd();
  expect(editable.ownerDocument.activeElement).toBe(editable);
});

it("does not delete a new source selection after a cross-editor drop", async ({
  setupEditor,
  selectText,
}) => {
  const { editor: source } = await setupEditor({
    mountType: "dom",
    initialContent: [
      { id: "dragged", type: "paragraph", content: "Move this" },
      { id: "keep", type: "paragraph", content: "Keep this" },
    ],
  });
  const { editor: target } = await setupEditor({
    mountType: "dom",
    initialContent: [{ type: "paragraph", content: "Target" }],
  });
  const sourceParagraph = source.domElement!.querySelector("p")!;
  const targetParagraph = target.domElement!.querySelector("p")!;
  const dataTransfer = new DataTransfer();
  const kept = source.getBlock("keep");

  function dispatchDragEvent(element: Element, type: string) {
    const { left, top, height } = element.getBoundingClientRect();
    element.dispatchEvent(
      new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: left + 2,
        clientY: top + height / 2,
        dataTransfer,
      }),
    );
  }

  source.focus();
  selectText(source, "Move this");
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  try {
    dispatchDragEvent(sourceParagraph, "dragstart");
    dispatchDragEvent(targetParagraph, "drop");
    dispatchDragEvent(sourceParagraph, "dragend");

    expect(dataTransfer.getData("text/plain")).toBe("Move this");
    expect(target.domElement!.textContent).toContain("Move this");
    vi.advanceTimersByTime(0);
    expect(source.getBlock("dragged")?.content).toEqual([]);

    selectText(source, "Keep this");
    // Tiptap used to schedule a second deleteRange 10 ms after the drop.
    vi.runOnlyPendingTimers();
    expect(source.getBlock("keep")).toEqual(kept);
  } finally {
    vi.useRealTimers();
  }
});
