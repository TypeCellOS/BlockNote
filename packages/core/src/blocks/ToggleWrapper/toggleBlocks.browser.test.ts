import { TextSelection } from "prosemirror-state";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import "../../style.css";
import { getNodeById } from "../../api/nodeUtil.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { getDefaultSlashMenuItems } from "../../extensions/SuggestionMenu/getDefaultSlashMenuItems.js";
import type { PartialBlock } from "../defaultBlocks.js";

// Behaviour of the built-in toggle blocks (toggle heading and toggle list
// item), including regressions reported under BLO-1018. Every test runs for
// both blocks. The expected behaviour is Notion's (compared on 2026-09-29),
// with one deliberate exception: a toggle heading turned into a regular
// heading keeps its children nested, where Notion moves them out. Tests for
// behaviour BlockNote does not match yet use `it.fails`: they state the
// expected behaviour, so they start failing - and must be switched to `it` -
// once it is implemented.

const MOD = navigator.platform.includes("Mac") ? "Meta" : "Control";

const kinds = [
  {
    name: "toggle heading",
    toggle: (
      id: string,
      content: string,
      children: PartialBlock[] = [],
    ): PartialBlock => ({
      id,
      type: "heading",
      props: { level: 2, isToggleable: true },
      content,
      children,
    }),
    newBlockTypeAfterClosedToggle: "paragraph",
  },
  {
    name: "toggle list item",
    toggle: (
      id: string,
      content: string,
      children: PartialBlock[] = [],
    ): PartialBlock => ({
      id,
      type: "toggleListItem",
      content,
      children,
    }),
    newBlockTypeAfterClosedToggle: "toggleListItem",
  },
];

let editor: BlockNoteEditor;
let root: HTMLElement;

function mount(content: PartialBlock[], options = { editable: true }) {
  root = document.createElement("div");
  document.body.appendChild(root);
  editor = BlockNoteEditor.create({ initialContent: content });
  editor.isEditable = options.editable;
  editor.mount(root);
}

/** Replaces the editor with a new one, as a page reload would. */
function remount(content: PartialBlock[], options = { editable: true }) {
  editor._tiptapEditor.destroy();
  root.remove();
  mount(content, options);
}

beforeEach(() => {
  // The open state of a toggle is kept in `localStorage`, keyed by block id.
  localStorage.clear();
});

afterEach(() => {
  editor._tiptapEditor.destroy();
  root.remove();
});

/** The block's type, text and children, e.g. `heading"Title"[paragraph"One"]`. */
function shape(blocks = editor.document): string {
  return blocks
    .map((block) => {
      const text = Array.isArray(block.content)
        ? block.content.map((c) => ("text" in c ? c.text : "")).join("")
        : "";
      const children = block.children.length
        ? `[${shape(block.children)}]`
        : "";
      return `${block.type}"${text}"${children}`;
    })
    .join(", ");
}

function blockElement(id: string) {
  const element = root.querySelector(`.bn-block[data-id="${id}"]`);
  if (!element) {
    throw new Error(`Block "${id}" is not rendered`);
  }
  return element as HTMLElement;
}

/**
 * The first element matching `selector` that belongs to the block itself,
 * not to one of its children. Where it sits inside the block is left open.
 */
function own(id: string, selector: string) {
  const block = blockElement(id);
  return (
    [...block.querySelectorAll<HTMLElement>(selector)].find(
      (element) => element.closest(".bn-block") === block,
    ) ?? null
  );
}

function toggleButton(id: string) {
  return own(id, ".bn-toggle-button");
}

function addBlockButton(id: string) {
  return own(id, ".bn-toggle-add-block-button");
}

/** Whether the toggle is open, as the toggle wrapper records it. */
function isOpen(id: string) {
  const wrapper = own(id, ".bn-toggle-wrapper");
  if (!wrapper) {
    throw new Error(`Block "${id}" is not a toggle`);
  }
  return wrapper.dataset.showChildren === "true";
}

function childrenAreVisible(id: string) {
  const group = own(id, ".bn-block-group");
  if (!group) {
    throw new Error(`Block "${id}" has no children`);
  }
  return getComputedStyle(group).display !== "none";
}

async function open(id: string) {
  await userEvent.click(toggleButton(id)!);
}

/** Puts the caret in the block and presses the keys. */
async function press(
  keys: string,
  at: { block: string; placement: "start" | "end" },
) {
  editor.setTextCursorPosition(at.block, at.placement);
  editor.focus();
  await userEvent.keyboard(keys);
}

/**
 * Puts the caret after the first `offset` characters of the block's text.
 * BlockNote's API can only put the caret at the start or end of a block.
 */
function setCaretAt(id: string, offset: number) {
  editor.transact((tr) => {
    const block = getNodeById(id, tr.doc)!;
    // Inside the block, then inside its content.
    const textStart = block.posBeforeNode + 2;
    tr.setSelection(TextSelection.create(tr.doc, textStart + offset));
  });
  editor.focus();
}

describe.each(kinds)("$name", ({ toggle, newBlockTypeAfterClosedToggle }) => {
  const withChildren = (): PartialBlock[] => [
    toggle("t", "Title", [
      { id: "c1", type: "paragraph", content: "One" },
      { id: "c2", type: "paragraph", content: "Two" },
    ]),
    { id: "after", type: "paragraph", content: "After" },
  ];

  describe("open state", () => {
    it("starts closed, with its children hidden", () => {
      mount(withChildren());

      expect(isOpen("t")).toBe(false);
      expect(childrenAreVisible("t")).toBe(false);
    });

    it("shows and hides its children with the chevron, without changing the document", async () => {
      mount(withChildren());
      const document = JSON.stringify(editor.document);

      await open("t");
      expect(childrenAreVisible("t")).toBe(true);

      await open("t");
      expect(childrenAreVisible("t")).toBe(false);
      expect(JSON.stringify(editor.document)).toBe(document);
    });

    it("keeps the open state for the block when the editor is recreated", async () => {
      mount(withChildren());
      await open("t");

      remount(withChildren());
      expect(isOpen("t")).toBe(true);
      expect(childrenAreVisible("t")).toBe(true);

      await open("t");
      remount(withChildren());
      expect(isOpen("t")).toBe(false);
    });

    it("keeps the caret where it is when the chevron is clicked", async () => {
      mount(withChildren());
      editor.setTextCursorPosition("after", "end");
      editor.focus();

      await open("t");

      expect(editor.getTextCursorPosition().block.id).toBe("after");
      expect(editor.isFocused()).toBe(true);
    });

    it("does not re-render the block when it is opened or closed", async () => {
      mount(withChildren());
      const content = own("t", ".bn-block-content")!;

      await open("t");
      await open("t");

      expect(content.isConnected).toBe(true);
    });

    it("opens when a block is indented into it", async () => {
      mount(withChildren());

      await press("{Tab}", { block: "after", placement: "start" });

      expect(editor.getBlock("t")!.children.map((child) => child.id)).toEqual([
        "c1",
        "c2",
        "after",
      ]);
      expect(isOpen("t")).toBe(true);
      expect(childrenAreVisible("t")).toBe(true);

      // The toggle opened itself, and that is kept like a click.
      remount(editor.document);
      expect(isOpen("t")).toBe(true);
    });

    // Notion keeps the toggle open, showing its empty-toggle placeholder.
    it.fails("stays open, as an empty toggle, when its last child is removed", async () => {
      mount([toggle("t", "Title", [{ id: "c1", type: "paragraph" }])]);
      await open("t");

      editor.removeBlocks(["c1"]);

      expect(editor.getBlock("t")!.children).toHaveLength(0);
      expect(isOpen("t")).toBe(true);
      expect(addBlockButton("t")).not.toBeNull();
    });

    it("stays open when one of several children is removed", async () => {
      mount(withChildren());
      await open("t");

      editor.removeBlocks(["c1"]);

      expect(isOpen("t")).toBe(true);
      expect(childrenAreVisible("t")).toBe(true);
    });
  });

  describe("empty toggle", () => {
    it('shows an "Add block" button when open, which adds a child and puts the caret in it', async () => {
      mount([toggle("t", "Title")]);
      expect(addBlockButton("t")).toBeNull();

      await open("t");
      await userEvent.click(addBlockButton("t")!);

      const child = editor.getBlock("t")!.children;
      expect(child).toHaveLength(1);
      expect(editor.getTextCursorPosition().block.id).toBe(child[0].id);
      expect(addBlockButton("t")).toBeNull();
    });

    it('removes the "Add block" button when closed', async () => {
      mount([toggle("t", "Title")]);
      await open("t");

      await open("t");

      expect(addBlockButton("t")).toBeNull();
    });

    it('replaces the "Add block" button when a block is indented into it', async () => {
      mount([
        toggle("t", "Title"),
        { id: "after", type: "paragraph", content: "After" },
      ]);
      await open("t");

      await press("{Tab}", { block: "after", placement: "start" });

      expect(editor.getBlock("t")!.children.map((child) => child.id)).toEqual([
        "after",
      ]);
      expect(addBlockButton("t")).toBeNull();
      expect(childrenAreVisible("t")).toBe(true);
    });

    it('shows the "Add block" button when it was left open and is recreated', async () => {
      mount([toggle("t", "Title")]);
      await open("t");

      remount([toggle("t", "Title")]);

      expect(isOpen("t")).toBe(true);
      expect(addBlockButton("t")).not.toBeNull();
    });

    it('shows no "Add block" button in a read-only editor', async () => {
      mount([toggle("t", "Title")]);
      editor.isEditable = false;

      await open("t");

      expect(addBlockButton("t")).toBeNull();
    });

    it('shows no "Add block" button when a read-only editor opens it from its saved state', async () => {
      mount([toggle("t", "Title")]);
      await open("t");

      remount([toggle("t", "Title")], { editable: false });

      expect(isOpen("t")).toBe(true);
      expect(addBlockButton("t")).toBeNull();
    });

    // BLO-956 (comment): in an open, empty toggle, the caret could not move
    // down out of the title.
    it.fails("ArrowDown moves the caret to the next block (BLO-956)", async () => {
      mount([
        toggle("t", "Title"),
        { id: "after", type: "paragraph", content: "After" },
      ]);
      await open("t");

      await press("{ArrowDown}", { block: "t", placement: "end" });

      expect(editor.getTextCursorPosition().block.id).toBe("after");
    });
  });

  describe("Enter", () => {
    // BLO-929: Enter at the end of an open toggle's title should start the
    // toggle's body, as in Notion, not a new block after the toggle.
    it.fails("at the end of an open toggle's title adds a first child (BLO-929)", async () => {
      mount(withChildren());
      await open("t");

      await press("{Enter}", { block: "t", placement: "end" });

      const toggleBlock = editor.getBlock("t")!;
      expect(toggleBlock.children).toHaveLength(3);
      expect(editor.getTextCursorPosition().block.id).toBe(
        toggleBlock.children[0].id,
      );
    });

    // BLO-998 / #2020: on a closed toggle, the new block after it must not
    // take the toggle's children.
    it("at the end of a closed toggle's title keeps the children in the toggle (BLO-998)", async () => {
      mount(withChildren());

      await press("{Enter}", { block: "t", placement: "end" });

      const [first, second] = editor.document;
      expect(first.id).toBe("t");
      expect(first.children.map((child) => child.id)).toEqual(["c1", "c2"]);
      expect(second.children).toHaveLength(0);
      // A toggle list continues as a list; a heading continues with text.
      expect(second.type).toBe(newBlockTypeAfterClosedToggle);
      expect(editor.getTextCursorPosition().block.id).toBe(second.id);
    });

    // BLO-949: Enter in the title must not break the children apart. As in
    // Notion, the text after the caret becomes the toggle's first child.
    it.fails("in the middle of an open toggle's title moves the rest of the title into a first child (BLO-949)", async () => {
      mount(withChildren());
      await open("t");

      setCaretAt("t", 2);
      await userEvent.keyboard("{Enter}");

      expect(shape([editor.getBlock("t")!])).toMatch(
        /^\w+"Ti"\[paragraph"tle", paragraph"One", paragraph"Two"\]$/,
      );
      expect(editor.getTextCursorPosition().block.id).toBe(
        editor.getBlock("t")!.children[0].id,
      );
    });

    // As in Notion, Enter on an empty last child stays inside the toggle.
    it.fails("on an empty last child adds another child", async () => {
      mount([
        toggle("t", "Title", [
          { id: "c1", type: "paragraph", content: "One" },
          { id: "c2", type: "paragraph" },
        ]),
      ]);
      await open("t");

      await press("{Enter}", { block: "c2", placement: "start" });

      const children = editor.getBlock("t")!.children;
      expect(children.map((child) => child.id).slice(0, 2)).toEqual([
        "c1",
        "c2",
      ]);
      expect(children).toHaveLength(3);
      expect(editor.getTextCursorPosition().block.id).toBe(children[2].id);
    });

    // BLO-949: Enter in a child continues inside the toggle.
    it("at the end of a child adds a sibling child (BLO-949)", async () => {
      mount(withChildren());
      await open("t");

      await press("{Enter}", { block: "c1", placement: "end" });

      const children = editor.getBlock("t")!.children;
      expect(children).toHaveLength(3);
      expect(children[0].id).toBe("c1");
      expect(editor.getTextCursorPosition().block.id).toBe(children[1].id);
    });
  });

  it("turned into a paragraph shows its children and no chevron", () => {
    mount(withChildren());

    editor.updateBlock("t", { type: "paragraph", props: {} });

    expect(toggleButton("t")).toBeNull();
    expect(childrenAreVisible("t")).toBe(true);
  });

  describe("Backspace", () => {
    // As in Notion, Backspace at the start of the first child merges it into
    // the title.
    it.fails("at the start of the first child merges it into the title", async () => {
      mount(withChildren());
      await open("t");

      await press("{Backspace}", { block: "c1", placement: "start" });

      expect(shape([editor.getBlock("t")!])).toMatch(
        /^\w+"TitleOne"\[paragraph"Two"\]$/,
      );
      expect(editor.document.map((block) => block.id)).toEqual(["t", "after"]);
    });
  });

  // Shift-Mod-ArrowUp/Down, BlockNote's shortcuts for moving blocks.
  describe("moving blocks", () => {
    const moveUp = `{${MOD}>}{Shift>}{ArrowUp}{/Shift}{/${MOD}}`;
    const moveDown = `{${MOD}>}{Shift>}{ArrowDown}{/Shift}{/${MOD}}`;

    it("opens a closed toggle when a block is moved into it", async () => {
      mount(withChildren());

      await press(moveUp, { block: "after", placement: "start" });

      expect(editor.getBlock("t")!.children.map((child) => child.id)).toEqual([
        "c1",
        "c2",
        "after",
      ]);
      expect(isOpen("t")).toBe(true);
      expect(childrenAreVisible("t")).toBe(true);
    });

    it.fails("keeps a toggle open when its last child is moved out", async () => {
      mount([
        toggle("t", "Title", [{ id: "c1", type: "paragraph", content: "One" }]),
      ]);
      await open("t");

      await press(moveDown, { block: "c1", placement: "start" });

      expect(editor.document.map((block) => block.id)).toEqual(["t", "c1"]);
      expect(isOpen("t")).toBe(true);
      expect(addBlockButton("t")).not.toBeNull();
    });

    it("keeps an open toggle open, with its children, when it is moved", async () => {
      mount([
        { id: "before", type: "paragraph", content: "Before" },
        ...withChildren(),
      ]);
      await open("t");

      await press(moveUp, { block: "t", placement: "end" });

      expect(editor.document.map((block) => block.id)).toEqual([
        "t",
        "before",
        "after",
      ]);
      expect(editor.getBlock("t")!.children.map((child) => child.id)).toEqual([
        "c1",
        "c2",
      ]);
      expect(isOpen("t")).toBe(true);
      expect(childrenAreVisible("t")).toBe(true);
    });

    it("keeps a closed toggle closed, with its children, when it is moved", async () => {
      mount([
        { id: "before", type: "paragraph", content: "Before" },
        ...withChildren(),
      ]);

      await press(moveUp, { block: "t", placement: "end" });

      expect(editor.document.map((block) => block.id)).toEqual([
        "t",
        "before",
        "after",
      ]);
      expect(editor.getBlock("t")!.children.map((child) => child.id)).toEqual([
        "c1",
        "c2",
      ]);
      expect(isOpen("t")).toBe(false);
      expect(childrenAreVisible("t")).toBe(false);
    });
  });

  describe("indentation", () => {
    it("Shift-Tab moves a child out of the toggle", async () => {
      mount(withChildren());
      await open("t");

      await press("{Shift>}{Tab}{/Shift}", { block: "c2", placement: "start" });

      expect(editor.getBlock("t")!.children.map((child) => child.id)).toEqual([
        "c1",
      ]);
      expect(editor.document.map((block) => block.id)).toEqual([
        "t",
        "c2",
        "after",
      ]);
    });
  });
});

// As in Notion, Enter in an empty toggle title removes the toggle: a toggle
// list item becomes a paragraph, a toggle heading a regular heading.
describe("Enter in an empty toggle title", () => {
  it("turns a toggle list item into a paragraph", async () => {
    mount([
      { id: "t", type: "toggleListItem", content: "Title" },
      { id: "empty", type: "toggleListItem" },
    ]);

    await press("{Enter}", { block: "empty", placement: "start" });

    expect(editor.getBlock("empty")!.type).toBe("paragraph");
    expect(editor.document).toHaveLength(2);
  });

  it.fails("turns a toggle heading into a regular heading", async () => {
    mount([
      { id: "t", type: "paragraph", content: "Before" },
      { id: "empty", type: "heading", props: { level: 2, isToggleable: true } },
    ]);

    await press("{Enter}", { block: "empty", placement: "start" });

    expect(editor.getBlock("empty")!.props).toMatchObject({
      level: 2,
      isToggleable: false,
    });
    expect(editor.document).toHaveLength(2);
    expect(toggleButton("empty")).toBeNull();
  });
});

// BLO-959: turning a toggle heading into a regular heading must remove the
// toggle behaviour. Each way of turning a block into a heading is covered.
// Unlike Notion, which moves the children out (its headings can't have
// children), the children stay nested under the heading.
describe("toggle heading turned into a regular heading (BLO-959)", () => {
  const toggleHeading = () => [
    {
      id: "t",
      type: "heading" as const,
      props: { level: 1 as const, isToggleable: true },
      content: "Title",
      children: [{ id: "c1", type: "paragraph" as const, content: "One" }],
    },
  ];

  function expectRegularHeading() {
    expect(editor.getBlock("t")!.props).toMatchObject({
      level: 2,
      isToggleable: false,
    });
    expect(toggleButton("t")).toBeNull();
    expect(editor.getBlock("t")!.children.map((child) => child.id)).toEqual([
      "c1",
    ]);
    expect(childrenAreVisible("t")).toBe(true);
  }

  it("with the block type menu's props", () => {
    mount(toggleHeading());

    // What the formatting toolbar's block type select applies for "Heading 2".
    editor.updateBlock("t", {
      type: "heading",
      props: { level: 2, isToggleable: false },
    });

    expectRegularHeading();
  });

  // Not compared with Notion: its Cmd-Option-2 could not be automated there.
  it.fails("with the heading keyboard shortcut", async () => {
    mount(toggleHeading());

    await press(`{${MOD}>}{Alt>}2{/Alt}{/${MOD}}`, {
      block: "t",
      placement: "end",
    });

    expectRegularHeading();
  });

  // In Notion, the slash menu's "Heading 2" in an empty toggle heading keeps
  // the toggle heading and inserts a regular heading after it.
  it.fails("with the slash menu's heading item, which inserts a new heading instead", () => {
    mount([
      {
        id: "t",
        type: "heading",
        props: { level: 1, isToggleable: true },
      },
    ]);
    editor.setTextCursorPosition("t", "end");

    getDefaultSlashMenuItems(editor)
      .find((item) => item.key === "heading_2")!
      .onItemClick();

    const [toggleHeading, inserted] = editor.document;
    expect(toggleHeading.id).toBe("t");
    expect(toggleHeading.props).toMatchObject({ level: 1, isToggleable: true });
    expect(inserted.type).toBe("heading");
    expect(inserted.props).toMatchObject({ level: 2, isToggleable: false });
    expect(editor.getTextCursorPosition().block.id).toBe(inserted.id);
  });
});
