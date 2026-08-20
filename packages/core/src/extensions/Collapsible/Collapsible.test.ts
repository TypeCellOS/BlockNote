import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { CollapsibleExtension } from "./Collapsible.js";

/**
 * @vitest-environment jsdom
 */

// Editors are unmounted after each test — otherwise prosemirror-view's
// DOMObserver leaves a setTimeout alive that fires after vitest tears down
// jsdom.
const activeEditors: BlockNoteEditor<any, any, any>[] = [];

beforeEach(() => {
  // Collapse state is persisted per block ID, so it would otherwise leak
  // between tests that reuse an ID.
  window.localStorage.clear();
});

afterEach(() => {
  while (activeEditors.length) {
    activeEditors.pop()!.unmount();
  }
  window.localStorage.clear();
});

function createEditor(initialContent: PartialBlock<any, any, any>[]) {
  const editor = BlockNoteEditor.create({ initialContent });
  editor.mount(document.createElement("div"));
  activeEditors.push(editor);

  return editor;
}

/** Collapse state lives on the extension, not on the editor. */
function collapsible(editor: BlockNoteEditor<any, any, any>) {
  return editor.getExtension(CollapsibleExtension)!;
}

function blockOuter(editor: BlockNoteEditor<any, any, any>, id: string) {
  const element = editor.prosemirrorView.dom.querySelector(
    `.bn-block-outer[data-id="${id}"]`,
  );
  if (!element) {
    throw new Error(`No block with ID ${id} rendered`);
  }

  return element;
}

function chevron(editor: BlockNoteEditor<any, any, any>, id: string) {
  return blockOuter(editor, id).querySelector<HTMLButtonElement>(
    ":scope > .bn-block > .bn-collapse-button",
  );
}

function addChildButton(editor: BlockNoteEditor<any, any, any>, id: string) {
  return blockOuter(editor, id).querySelector<HTMLButtonElement>(
    ":scope > .bn-block > .bn-collapse-add-block > .bn-collapse-add-block-button",
  );
}

/**
 * Presses Enter the way ProseMirror does. `commands.keyboardShortcut()` isn't
 * equivalent: it replays only the *steps* a handler dispatched, so a selection
 * the handler set is dropped.
 */
function pressEnter(editor: BlockNoteEditor<any, any, any>) {
  const view = editor.prosemirrorView;
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    bubbles: true,
    cancelable: true,
  });

  view.someProp("handleKeyDown", (handler) => handler(view, event));
}

const TOGGLE_HEADING: PartialBlock<any, any, any> = {
  id: "toggle-heading",
  type: "heading",
  props: { level: 2, isToggleable: true },
  content: "Toggle Heading",
};

const TOGGLE_HEADING_WITH_CHILD: PartialBlock<any, any, any>[] = [
  {
    ...TOGGLE_HEADING,
    children: [{ id: "child", type: "paragraph", content: "Child" }],
  },
  { id: "after", type: "paragraph", content: "After" },
];

describe("CollapsibleExtension", () => {
  it("collapses and expands without touching the document", () => {
    const editor = createEditor(TOGGLE_HEADING_WITH_CHILD);
    const before = JSON.stringify(editor.document);
    const outer = () => blockOuter(editor, "toggle-heading");

    // Collapsible blocks start collapsed.
    expect(collapsible(editor).isCollapsed({ id: "toggle-heading" })).toBe(
      true,
    );
    expect(outer().getAttribute("data-collapsed")).toBe("true");
    expect(outer().getAttribute("data-collapsible")).toBe("true");
    // The chevron is the disclosure control, so it's what carries the state
    // for screen readers.
    expect(
      chevron(editor, "toggle-heading")!.getAttribute("aria-expanded"),
    ).toBe("false");

    collapsible(editor).setCollapsed({ id: "toggle-heading" }, false);
    expect(collapsible(editor).isCollapsed({ id: "toggle-heading" })).toBe(
      false,
    );
    expect(outer().hasAttribute("data-collapsed")).toBe(false);
    expect(
      chevron(editor, "toggle-heading")!.getAttribute("aria-expanded"),
    ).toBe("true");

    collapsible(editor).setCollapsed({ id: "toggle-heading" }, true);
    expect(outer().getAttribute("data-collapsed")).toBe("true");

    expect(JSON.stringify(editor.document)).toBe(before);
  });

  it("clicking the chevron toggles the block", () => {
    const editor = createEditor(TOGGLE_HEADING_WITH_CHILD);

    chevron(editor, "toggle-heading")!.click();
    expect(collapsible(editor).isCollapsed({ id: "toggle-heading" })).toBe(
      false,
    );

    chevron(editor, "toggle-heading")!.click();
    expect(collapsible(editor).isCollapsed({ id: "toggle-heading" })).toBe(
      true,
    );
  });

  it("honours a `toggle-${id}` entry written by a previous session", () => {
    window.localStorage.setItem("toggle-toggle-heading", "true");

    const editor = createEditor(TOGGLE_HEADING_WITH_CHILD);

    expect(collapsible(editor).isCollapsed({ id: "toggle-heading" })).toBe(
      false,
    );
  });

  it("only decorates blocks whose spec opts in", () => {
    const editor = createEditor([
      { id: "plain", type: "paragraph", content: "Paragraph" },
      {
        id: "plain-heading",
        type: "heading",
        props: { level: 1 },
        content: "Heading",
      },
      ...TOGGLE_HEADING_WITH_CHILD,
    ]);

    expect(blockOuter(editor, "plain").hasAttribute("data-collapsible")).toBe(
      false,
    );
    expect(chevron(editor, "plain")).toBe(null);
    expect(chevron(editor, "plain-heading")).toBe(null);
    expect(chevron(editor, "toggle-heading")).not.toBe(null);
  });

  // #2124
  it("drops the chevron when a toggle heading is converted to a plain heading", () => {
    const editor = createEditor(TOGGLE_HEADING_WITH_CHILD);

    editor.updateBlock("toggle-heading", {
      type: "heading",
      props: { isToggleable: false },
    });

    expect(chevron(editor, "toggle-heading")).toBe(null);
    // The block no longer folds, so its child is visible again.
    expect(
      blockOuter(editor, "toggle-heading").hasAttribute("data-collapsed"),
    ).toBe(false);
  });

  it("still renders where reading `localStorage` throws", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    // How a server-side render sees it: JSDOM documents have an opaque origin,
    // and accessing `localStorage` on one throws a SecurityError.
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("localStorage is not available for opaque origins");
      },
    });

    try {
      const editor = createEditor(TOGGLE_HEADING_WITH_CHILD);

      expect(chevron(editor, "toggle-heading")).not.toBe(null);
      expect(collapsible(editor).isCollapsed({ id: "toggle-heading" })).toBe(
        true,
      );
    } finally {
      Object.defineProperty(window, "localStorage", original!);
    }
  });

  it("expands a collapsed block that gains a child", () => {
    const editor = createEditor([
      { id: "toggle", type: "toggleListItem", content: "Toggle" },
    ]);
    expect(collapsible(editor).isCollapsed({ id: "toggle" })).toBe(true);

    editor.updateBlock("toggle", {
      children: [{ type: "paragraph", content: "Child" }],
    });

    // Otherwise the new child would be added straight into hidden content and
    // look like it had been deleted.
    expect(collapsible(editor).isCollapsed({ id: "toggle" })).toBe(false);
  });

  describe("add child affordance", () => {
    it("is offered only while expanded, until the editor goes read-only", () => {
      const editor = createEditor([TOGGLE_HEADING]);

      // Collapsed to start with, so nothing is offered yet.
      expect(addChildButton(editor, "toggle-heading")).toBe(null);

      collapsible(editor).setCollapsed({ id: "toggle-heading" }, false);
      expect(addChildButton(editor, "toggle-heading")).not.toBe(null);
      // Expanding does reveal something, so the chevron isn't inert.
      expect(chevron(editor, "toggle-heading")!.disabled).toBe(false);

      editor.isEditable = false;
      expect(addChildButton(editor, "toggle-heading")).toBe(null);
      // Nothing to reveal now: no children, and no way to add one.
      expect(chevron(editor, "toggle-heading")!.disabled).toBe(true);
    });

    it("is not offered by a block that isn't collapsible, or one with children", () => {
      const editor = createEditor([
        { id: "plain", type: "paragraph", content: "Paragraph" },
        ...TOGGLE_HEADING_WITH_CHILD,
      ]);
      collapsible(editor).setCollapsed({ id: "toggle-heading" }, false);

      expect(addChildButton(editor, "plain")).toBe(null);
      expect(addChildButton(editor, "toggle-heading")).toBe(null);
    });

    it("adds a single child block in one undo step", () => {
      const editor = createEditor([
        { id: "toggle", type: "toggleListItem", content: "Toggle" },
      ]);
      collapsible(editor).setCollapsed({ id: "toggle" }, false);

      addChildButton(editor, "toggle")!.click();

      const toggle = editor.document[0];
      expect(toggle.children).toHaveLength(1);
      expect(toggle.children[0].type).toBe("paragraph");
      // The new child is where the cursor is.
      expect(editor.getTextCursorPosition().block.id).toBe(
        toggle.children[0].id,
      );

      editor.undo();
      expect(editor.document[0].children).toHaveLength(0);
    });
  });

  describe("Enter at the end of the title", () => {
    // #1875 — the children are on screen, so that's where the next block
    // visibly belongs.
    it("starts a first child when the block is expanded, in one undo step", () => {
      const editor = createEditor([
        { id: "toggle", type: "toggleListItem", content: "Toggle" },
        { id: "after", type: "paragraph", content: "After" },
      ]);
      collapsible(editor).setCollapsed({ id: "toggle" }, false);
      editor.setTextCursorPosition("toggle", "end");

      pressEnter(editor);

      expect(editor.document.map((block) => block.id)).toEqual([
        "toggle",
        "after",
      ]);

      const toggle = editor.document[0];
      expect(toggle.children).toHaveLength(1);
      expect(toggle.children[0].type).toBe("paragraph");
      expect(toggle.children[0].content).toEqual([]);
      expect(editor.getTextCursorPosition().block.id).toBe(
        toggle.children[0].id,
      );

      editor.undo();
      expect(editor.document[0].children).toHaveLength(0);
    });

    // #2378 — a new child would be hidden, so it'd look like nothing happened.
    // Splitting off a sibling is what Notion does here, and the children stay
    // with the block they belong to.
    it("splits off a sibling when the block is collapsed", () => {
      const editor = createEditor([
        {
          id: "toggle",
          type: "toggleListItem",
          content: "Toggle",
          children: [{ id: "child", type: "paragraph", content: "Child" }],
        },
      ]);
      expect(collapsible(editor).isCollapsed({ id: "toggle" })).toBe(true);
      editor.setTextCursorPosition("toggle", "end");

      pressEnter(editor);

      expect(editor.document).toHaveLength(2);
      expect(editor.document[0].id).toBe("toggle");
      expect(editor.document[0].children.map((child) => child.id)).toEqual([
        "child",
      ]);
      expect(editor.document[1].type).toBe("toggleListItem");
      expect(editor.document[1].children).toHaveLength(0);
    });

    it("does the same on a toggle heading, and nothing on a plain one", () => {
      const editor = createEditor([
        TOGGLE_HEADING,
        { id: "heading", type: "heading", props: { level: 2 }, content: "H" },
      ]);
      collapsible(editor).setCollapsed({ id: "toggle-heading" }, false);

      editor.setTextCursorPosition("toggle-heading", "end");
      pressEnter(editor);
      expect(editor.document[0].children).toHaveLength(1);
      expect(editor.getTextCursorPosition().block.id).toBe(
        editor.document[0].children[0].id,
      );

      editor.setTextCursorPosition("heading", "end");
      pressEnter(editor);
      const heading = editor.document.find((block) => block.id === "heading")!;
      expect(heading.children).toHaveLength(0);
      expect(editor.document).toHaveLength(3);
    });

    it("puts the new child first and leaves existing children in place", () => {
      const editor = createEditor([
        {
          id: "toggle",
          type: "toggleListItem",
          content: "Toggle",
          children: [
            { id: "child-0", type: "paragraph", content: "Child 0" },
            { id: "child-1", type: "paragraph", content: "Child 1" },
          ],
        },
      ]);
      collapsible(editor).setCollapsed({ id: "toggle" }, false);
      editor.setTextCursorPosition("toggle", "end");

      pressEnter(editor);

      const children = editor.document[0].children;
      expect(children).toHaveLength(3);
      expect(children[0].content).toEqual([]);
      expect(children.slice(1).map((child) => child.id)).toEqual([
        "child-0",
        "child-1",
      ]);
    });

    it("leaves the block's own Enter handling to run elsewhere in the title", () => {
      const editor = createEditor([
        { id: "empty", type: "toggleListItem", content: "" },
        {
          id: "toggle",
          type: "toggleListItem",
          content: "Toggle",
          children: [{ id: "child", type: "paragraph", content: "Child" }],
        },
      ]);
      collapsible(editor).setCollapsed({ id: "empty" }, false);
      collapsible(editor).setCollapsed({ id: "toggle" }, false);

      // An empty list item becomes a paragraph, as other list items do.
      editor.setTextCursorPosition("empty", "end");
      pressEnter(editor);
      expect(editor.document[0].type).toBe("paragraph");
      expect(editor.document[0].children).toHaveLength(0);

      // A cursor part-way through the title splits it, keeping the children.
      editor.setTextCursorPosition("toggle", "start");
      pressEnter(editor);
      const toggle = editor.document.find((block) => block.id === "toggle")!;
      expect(toggle.children.map((child) => child.id)).toEqual(["child"]);
    });
  });
});
