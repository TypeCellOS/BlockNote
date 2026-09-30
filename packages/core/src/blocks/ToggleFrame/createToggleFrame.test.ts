import { Fragment, Slice } from "prosemirror-model";
import { getNodeById } from "../../api/nodeUtil.js";
import { getBlockInfoAt } from "../../api/getBlockInfoFromPos.js";
import { handleToggleDrop } from "../../extensions/Toggle/toggleDrop.js";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { ToggleExtension } from "../../extensions/Toggle/Toggle.js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PartialBlock } from "../defaultBlocks.js";
import { defaultToggledState } from "./toggledState.js";

const editors: BlockNoteEditor[] = [];

function mount(initialContent: PartialBlock[]) {
  const editor = BlockNoteEditor.create({ initialContent });
  editors.push(editor);
  editor.mount(document.createElement("div"));
  return editor;
}

function frame(editor: BlockNoteEditor, id = "toggle") {
  return editor.domElement!.querySelector<HTMLElement>(
    `[data-id="${id}"] > .bn-block > .bn-toggle-frame`,
  )!;
}

function clickToggle(element: HTMLElement) {
  element
    .querySelector<HTMLButtonElement>(":scope > .bn-toggle-button")!
    .click();
}

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor._tiptapEditor.destroy();
  }
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("built-in toggle frames", () => {
  it("keeps nested DOM and document state when toggling", async () => {
    const editor = mount([
      {
        id: "toggle",
        type: "toggleListItem",
        content: "Title",
        children: [
          {
            id: "nested",
            type: "toggleListItem",
            content: "Nested",
            children: [{ id: "body", type: "paragraph", content: "Body" }],
          },
        ],
      },
    ]);
    const outer = frame(editor);
    const nested = frame(editor, "nested");
    const body = editor.domElement!.querySelector('[data-id="body"]');
    const before = editor.document;
    clickToggle(outer);
    clickToggle(nested);
    clickToggle(outer);
    clickToggle(outer);
    // Let the DOM observer process the UI mutations as it would in an editor.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(frame(editor)).toBe(outer);
    expect(frame(editor, "nested")).toBe(nested);
    expect(editor.domElement!.querySelector('[data-id="body"]')).toBe(body);
    expect(nested.dataset.showChildren).toBe("true");
    expect(editor.document).toEqual(before);
    expect(outer.querySelector("button")!.getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("opens on child insertion and closes when the last child is removed", () => {
    const editor = mount([
      { id: "toggle", type: "toggleListItem", content: "Title" },
    ]);
    const original = frame(editor);
    expect(original.dataset.showChildren).toBe("false");
    const [child] = editor.insertBlocks([{}], "toggle", "first-child");
    expect(frame(editor)).toBe(original);
    expect(original.dataset.showChildren).toBe("true");
    editor.removeBlocks([child]);
    expect(original.dataset.showChildren).toBe("false");
  });

  it("adds the first child and focuses it in a single undo step", () => {
    const editor = mount([
      { id: "toggle", type: "toggleListItem", content: "Title" },
    ]);
    const before = editor.document;
    clickToggle(frame(editor));
    frame(editor)
      .querySelector<HTMLButtonElement>(".bn-toggle-add-block-button")!
      .click();
    const child = editor.getBlock("toggle")!.children[0];
    expect(child.type).toBe("paragraph");
    expect(editor.getTextCursorPosition().block.id).toBe(child.id);
    editor.undo();
    expect(editor.document).toEqual(before);
  });

  it("adds and removes a heading frame when toggleability changes", () => {
    const editor = mount([
      {
        id: "toggle",
        type: "heading",
        props: { level: 2 },
        content: "Title",
        children: [{ id: "body", type: "paragraph", content: "Body" }],
      },
    ]);
    expect(frame(editor)).toBeNull();
    editor.updateBlock("toggle", { props: { isToggleable: true } });
    expect(frame(editor)).not.toBeNull();
    editor.updateBlock("toggle", { props: { isToggleable: false } });
    expect(frame(editor)).toBeNull();
    expect(editor.getBlock("body")!.content).toEqual([
      { type: "text", text: "Body", styles: {} },
    ]);
    editor.updateBlock("toggle", { type: "toggleListItem" });
    expect(frame(editor)).not.toBeNull();
    editor.updateBlock("toggle", { type: "paragraph" });
    expect(frame(editor)).toBeNull();
  });

  it("keeps the frame through heading level and text edits", () => {
    const editor = mount([
      {
        id: "toggle",
        type: "heading",
        props: { isToggleable: true },
        content: "Title",
      },
    ]);
    const original = frame(editor);
    clickToggle(original);
    editor.updateBlock("toggle", { props: { level: 3 }, content: "Edited" });
    expect(frame(editor)).toBe(original);
    expect(original.querySelector("h3")!.textContent).toBe("Edited");
    expect(original.dataset.showChildren).toBe("true");
  });

  it("does not insert children in read-only mode", () => {
    const editor = mount([
      { id: "toggle", type: "toggleListItem", content: "Title" },
    ]);
    editor.isEditable = false;
    clickToggle(frame(editor));
    frame(editor)
      .querySelector<HTMLButtonElement>(".bn-toggle-add-block-button")!
      .click();
    expect(editor.getBlock("toggle")!.children).toEqual([]);
    editor.isEditable = true;
    frame(editor)
      .querySelector<HTMLButtonElement>(".bn-toggle-add-block-button")!
      .click();
    expect(editor.getBlock("toggle")!.children).toHaveLength(1);
  });

  it("exports expanded static frames without reading localStorage and round-trips them", () => {
    const editor = mount([
      {
        id: "toggle",
        type: "toggleListItem",
        content: "Title",
        children: [{ type: "paragraph", content: "Body" }],
      },
      {
        type: "heading",
        props: { isToggleable: true, level: 2 },
        content: "Heading",
        children: [{ type: "paragraph", content: "Heading body" }],
      },
    ]);
    const get = vi.spyOn(defaultToggledState, "get").mockImplementation(() => {
      throw new Error("Storage must not be read while serializing");
    });
    const html = editor.blocksToFullHTML(editor.document);
    expect(get).not.toHaveBeenCalled();
    const dom = document.createElement("div");
    dom.innerHTML = html;
    expect(
      dom.querySelectorAll('.bn-toggle-frame[data-show-children="true"]'),
    ).toHaveLength(2);
    expect(dom.querySelector(".bn-toggle-add-block-button")).toBeNull();
    get.mockRestore();
    expect(editor.tryParseHTMLToBlocks(html)).toEqual(editor.document);
    const external = editor.blocksToHTMLLossy(editor.document);
    dom.innerHTML = external;
    expect(dom.querySelectorAll("details[open]")).toHaveLength(2);
    expect(dom.textContent).toContain("Heading body");
  });
});

function pressEnter(editor: BlockNoteEditor, shiftKey = false) {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    bubbles: true,
    cancelable: true,
    shiftKey,
  });
  editor.prosemirrorView.someProp("handleKeyDown", (handler) =>
    handler(editor.prosemirrorView, event),
  );
}

it.each(["toggleListItem", "heading"] as const)(
  "Enter starts a child in an expanded %s and undoes once",
  (type) => {
    const editor = mount([
      {
        id: "toggle",
        ...(type === "heading"
          ? { type, props: { isToggleable: true } }
          : { type }),
        content: "Title",
        children: [{ id: "existing", content: "Existing" }],
      },
    ]);
    const before = editor.document;
    const controller = editor.getExtension(ToggleExtension)!;
    expect(controller.setExpanded("toggle", true)).toBe(true);
    expect(frame(editor).dataset.showChildren).toBe("true");
    editor.setTextCursorPosition("toggle", "end");
    pressEnter(editor);
    const children = editor.getBlock("toggle")!.children;
    expect(children).toHaveLength(2);
    expect(children[0].content).toEqual([]);
    expect(children[1].id).toBe("existing");
    expect(editor.getTextCursorPosition().block.id).toBe(children[0].id);
    editor.undo();
    expect(editor.document).toEqual(before);
  },
);

it("Enter materializes children for an expanded childless toggle", () => {
  const editor = mount([
    { id: "toggle", type: "toggleListItem", content: "Title" },
  ]);
  editor.getExtension(ToggleExtension)!.setExpanded("toggle", true);
  editor.setTextCursorPosition("toggle", "end");
  pressEnter(editor);
  expect(editor.getBlock("toggle")!.children).toHaveLength(1);
  expect(editor.getTextCursorPosition().block.id).toBe(
    editor.getBlock("toggle")!.children[0].id,
  );
  expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
});

it.each([0, 2, 5])(
  "splits a collapsed title at offset %s with children following the intended half",
  (offset) => {
    const editor = mount([
      {
        id: "toggle",
        type: "toggleListItem",
        content: "Title",
        children: [{ id: "child", content: "Child" }],
      },
    ]);
    const before = editor.document;
    editor.setTextCursorPosition("toggle", "start");
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, tr.selection.from + offset)),
    );
    pressEnter(editor);
    const [first, second] = editor.document;
    expect(
      (offset === 0 ? second : first).children.map((child) => child.id),
    ).toEqual(["child"]);
    expect((offset === 0 ? first : second).children).toEqual([]);
    expect(editor.getTextCursorPosition().block.id).toBe(second.id);
    editor.undo();
    expect(editor.document).toEqual(before);
  },
);

it("preserves Shift-Enter and empty-title list behavior", () => {
  const editor = mount([
    { id: "toggle", type: "toggleListItem", content: "Title" },
  ]);
  editor.getExtension(ToggleExtension)!.setExpanded("toggle", true);
  editor.setTextCursorPosition("toggle", "end");
  pressEnter(editor, true);
  expect(editor.getBlock("toggle")!.children).toEqual([]);
  expect(editor.getBlock("toggle")!.content).toEqual([
    { type: "text", text: "Title\n", styles: {} },
  ]);
  editor.updateBlock("toggle", { content: [] });
  editor.setTextCursorPosition("toggle", "end");
  pressEnter(editor);
  expect(editor.getBlock("toggle")!.type).toBe("paragraph");
  expect(
    editor.getExtension(ToggleExtension)!.isExpanded("toggle"),
  ).toBeUndefined();
});

it("unregisters frames on conversion and destruction", () => {
  const editor = mount([
    {
      id: "toggle",
      type: "heading",
      props: { isToggleable: true },
      content: "Title",
    },
  ]);
  const controller = editor.getExtension(ToggleExtension)!;
  controller.setExpanded("toggle", true);
  editor.updateBlock("toggle", { props: { isToggleable: false } });
  expect(controller.isExpanded("toggle")).toBeUndefined();
  expect(controller.setExpanded("toggle", false)).toBe(false);
  editor.updateBlock("toggle", { props: { isToggleable: true } });
  expect(controller.isExpanded("toggle")).toBe(true);
  editor.unmount();
  expect(controller.isExpanded("toggle")).toBeUndefined();
});

it("keeps failed storage writes authoritative even when reads still succeed", () => {
  const block = { id: "quota-fallback" };
  window.localStorage.setItem(`toggle-${block.id}`, "false");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  defaultToggledState.set(block, true);
  expect(defaultToggledState.get(block)).toBe(true);
  defaultToggledState.set(block, false);
  expect(defaultToggledState.get(block)).toBe(false);
});

it("handles unavailable storage while letting unexpected failures propagate", () => {
  const spy = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  const block = { id: "blocked-storage" };
  expect(defaultToggledState.get(block)).toBe(false);
  defaultToggledState.set(block, true);
  expect(defaultToggledState.get(block)).toBe(true);
  spy.mockImplementation(() => {
    throw new Error("Unexpected");
  });
  expect(() => defaultToggledState.get({ id: "unexpected-storage" })).toThrow(
    "Unexpected",
  );
});

it.each([false, true])(
  "drops whole blocks into an empty toggle (move: %s) in one undo step",
  (moved) => {
    const editor = mount([
      { id: "toggle", type: "toggleListItem", content: "Title" },
      { id: "source", content: "Source" },
    ]);
    const before = editor.document;
    const view = editor.prosemirrorView;
    const source = getNodeById("source", view.state.doc)!;
    view.dispatch(
      view.state.tr.setSelection(
        NodeSelection.create(view.state.doc, source.posBeforeNode),
      ),
    );
    const slice = view.state.selection.content();
    const target = getNodeById("toggle", view.state.doc)!.posBeforeNode;
    const info = getBlockInfoAt(view.state.doc, target);
    if (!info.hasContent) {
      throw new Error("Expected title");
    }
    vi.spyOn(view, "posAtCoords").mockReturnValue({
      pos: info.contentStart,
      inside: info.content.beforePos,
    });
    vi.spyOn(
      frame(editor).querySelector<HTMLElement>(".bn-block-content")!,
      "getBoundingClientRect",
    ).mockReturnValue(new DOMRect(0, 0, 200, 30));
    const controller = editor.getExtension(ToggleExtension)!;
    const event = new MouseEvent("drop", {
      clientX: 100,
      clientY: 15,
      cancelable: true,
    });
    expect(controller.getDropTargetPos(view, event, slice)).toBeUndefined();
    controller.setExpanded("toggle", true);
    expect(
      controller.getDropTargetPos(
        view,
        event,
        new Slice(Fragment.from(view.state.schema.text("text")), 0, 0),
      ),
    ).toBeUndefined();
    expect(
      controller.getDropTargetPos(view, { clientX: 100, clientY: 40 }, slice),
    ).toBeUndefined();
    editor.isEditable = false;
    expect(controller.getDropTargetPos(view, event, slice)).toBeUndefined();
    editor.isEditable = true;
    expect(controller.getDropTargetPos(view, event, slice)).toBe(target);
    // The helper only consumes preventDefault, shared by mouse and drag events.
    expect(handleToggleDrop(target, view, event, slice, moved)).toBe(true);
    expect(editor.getBlock("toggle")!.children[0].content).toEqual(
      before[1].content,
    );
    expect(
      editor.document.filter((block) => block.id === "source"),
    ).toHaveLength(moved ? 0 : 1);
    expect(() => view.state.doc.check()).not.toThrow();
    editor.undo();
    expect(editor.document).toEqual(before);
  },
);

it("rejects a drop whose source contains its target", () => {
  const editor = mount([
    { id: "toggle", type: "toggleListItem", content: "Title" },
  ]);
  const view = editor.prosemirrorView;
  const target = getNodeById("toggle", view.state.doc)!.posBeforeNode;
  view.dispatch(
    view.state.tr.setSelection(NodeSelection.create(view.state.doc, target)),
  );
  const before = editor.document;
  expect(
    handleToggleDrop(
      target,
      view,
      new MouseEvent("drop"),
      view.state.selection.content(),
      true,
    ),
  ).toBe(false);
  expect(editor.document).toEqual(before);
});
