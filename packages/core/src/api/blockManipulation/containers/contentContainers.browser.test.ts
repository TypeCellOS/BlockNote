import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { contentContainerSchema } from "./contentContainers.fixture.js";

// Keymap tests for content-bearing containers, split off from the
// node-environment `contentContainers.test.ts`. tiptap can only reach
// `handleKeyDown` through a mounted view, so the editor is mounted and
// focused here and the keys are pressed for real. Pure-container keyboard
// handling is covered in `containers.browser.test.ts`.

const schema = contentContainerSchema;

let editor: BlockNoteEditor<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;
let div: HTMLElement;

beforeAll(() => {
  div = document.createElement("div");
  document.body.appendChild(div);
  editor = BlockNoteEditor.create({ schema });
  editor.mount(div);
});

afterAll(() => {
  editor._tiptapEditor.destroy();
  div.remove();
  editor = undefined as any;
});

beforeEach(() => {
  editor.replaceBlocks(editor.document, [
    { id: "p-0", type: "paragraph", content: "Paragraph 0" },
  ]);
});

/** Puts the caret at the given position and presses the key. */
async function pressKey(
  key: string,
  at: { block: string; placement: "start" | "end"; offset?: number },
) {
  editor.setTextCursorPosition(at.block, at.placement);
  if (at.offset) {
    editor._tiptapEditor.commands.setTextSelection(
      editor._tiptapEditor.state.selection.from + at.offset,
    );
  }
  editor.focus();
  await userEvent.keyboard(`{${key}}`);
}

describe("content-bearing container: keyboard", () => {
  it("Backspace at the start of the title unwraps the container", async () => {
    editor.replaceBlocks(editor.document, [
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "toggle",
        id: "t-0",
        content: "Title",
        children: [
          { id: "t-p-0", type: "paragraph", content: "First" },
          { id: "t-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);

    await pressKey("Backspace", { block: "t-0", placement: "start" });

    // The unwrap must not destroy the title or the children.
    const unwrapped = editor.document[1];
    expect(unwrapped.type).toBe("paragraph");
    expect(unwrapped.content).toEqual([
      { type: "text", text: "Title", styles: {} },
    ]);
    expect(unwrapped.children.map((child) => child.id)).toEqual([
      "t-p-0",
      "t-p-1",
    ]);
  });

  it("Backspace at the start of the first child merges it into the title", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "toggle",
        id: "t-0",
        content: "Title",
        children: [
          { id: "t-p-0", type: "paragraph", content: "First" },
          { id: "t-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);

    await pressKey("Backspace", { block: "t-p-0", placement: "start" });

    const toggle = editor.getBlock("t-0")!;
    expect(toggle.content).toEqual([
      { type: "text", text: "TitleFirst", styles: {} },
    ]);
    expect(toggle.children.map((child) => child.id)).toEqual(["t-p-1"]);
  });

  it("Backspace after a sealed container selects it instead of merging into its title", async () => {
    // A content-bearing container is an ordinary merge target (its title is
    // `inline*`), so without the boundary the paragraph would merge into it.
    editor.replaceBlocks(editor.document, [
      {
        type: "sealedToggle",
        id: "st-0",
        content: "Title",
        children: [{ id: "st-p-0", type: "paragraph", content: "First" }],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);

    await pressKey("Backspace", { block: "after", placement: "start" });

    const toggle = editor.getBlock("st-0")!;
    expect(toggle.content).toEqual([
      { type: "text", text: "Title", styles: {} },
    ]);
    expect(editor.document.map((block) => block.id)).toEqual(["st-0", "after"]);
    const selection = editor.transact((tr) => tr.selection);
    expect("node" in selection && (selection.node as any).type.name).toBe(
      "sealedToggle",
    );
  });

  it("Delete before a sealed container selects it instead of merging it in", async () => {
    editor.replaceBlocks(editor.document, [
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "sealedToggle",
        id: "st-0",
        content: "Title",
        children: [{ id: "st-p-0", type: "paragraph", content: "First" }],
      },
    ]);

    await pressKey("Delete", { block: "before", placement: "end" });

    expect(editor.getBlock("before")!.content).toEqual([
      { type: "text", text: "Before", styles: {} },
    ]);
    expect(editor.document.map((block) => block.id)).toEqual([
      "before",
      "st-0",
    ]);
    const selection = editor.transact((tr) => tr.selection);
    expect("node" in selection && (selection.node as any).type.name).toBe(
      "sealedToggle",
    );
  });

  it("Enter on an empty last child of a sealed container stays inside", async () => {
    // The sealed guard has to resolve the config through the generated
    // `__children` node name. A plain block-type lookup misses it and lets
    // Enter escape the sealed boundary.
    editor.replaceBlocks(editor.document, [
      {
        type: "sealedToggle",
        id: "st-0",
        content: "Title",
        children: [
          { id: "st-p-0", type: "paragraph", content: "First" },
          { id: "st-p-1", type: "paragraph", content: "" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    await pressKey("Enter", { block: "st-p-1", placement: "end" });

    expect(editor.document.map((block) => block.id)).toEqual([
      "st-0",
      "trailing",
    ]);
    const children = editor.getBlock("st-0")!.children;
    expect(children).toHaveLength(3);
    expect(editor.getTextCursorPosition().block.id).toBe(children[2].id);
  });

  it("Backspace after a container with an empty body moves the block into it", async () => {
    // An empty-bodied content container is its own bottom nested block, and
    // merging into it would stitch across its required `__children` node,
    // so the block moves inside instead, like after any non-sealed container.
    editor.replaceBlocks(editor.document, [
      {
        type: "optionalToggle",
        id: "ot-0",
        content: "Title",
        children: [],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);

    await pressKey("Backspace", { block: "after", placement: "start" });

    const toggle = editor.getBlock("ot-0")!;
    expect(toggle.content).toEqual([
      { type: "text", text: "Title", styles: {} },
    ]);
    expect(toggle.children.map((child) => child.id)).toEqual(["after"]);
    expect(editor.document.map((block) => block.id)).toEqual(["ot-0"]);
  });

  it("Delete before a container merges its title in and un-nests its children", async () => {
    // The forward merge no longer stitches across the container boundary;
    // instead the container is dissolved: title into the previous block,
    // children out to the top level.
    editor.replaceBlocks(editor.document, [
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "toggle",
        id: "t-0",
        content: "Title",
        children: [{ id: "t-p-0", type: "paragraph", content: "First" }],
      },
    ]);

    await pressKey("Delete", { block: "before", placement: "end" });

    expect(editor.getBlock("before")!.content).toEqual([
      { type: "text", text: "BeforeTitle", styles: {} },
    ]);
    expect(editor.document.map((block) => block.id)).toEqual([
      "before",
      "t-p-0",
    ]);
  });

  it("Enter mid-title splits, with the tail becoming the first child", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "toggle",
        id: "t-0",
        content: "TitleTail",
        children: [{ id: "t-p-0", type: "paragraph", content: "First" }],
      },
    ]);

    await pressKey("Enter", { block: "t-0", placement: "start", offset: 5 });

    const toggle = editor.getBlock("t-0")!;
    expect(toggle.content).toEqual([
      { type: "text", text: "Title", styles: {} },
    ]);
    expect(toggle.children[0].content).toEqual([
      { type: "text", text: "Tail", styles: {} },
    ]);
    expect(toggle.children[1].id).toBe("t-p-0");
  });

  it("Enter on an empty last child still escapes the container", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "toggle",
        id: "t-0",
        content: "Title",
        children: [
          { id: "t-p-0", type: "paragraph", content: "First" },
          { id: "t-p-1", type: "paragraph", content: "" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    await pressKey("Enter", { block: "t-p-1", placement: "end" });

    expect(editor.getBlock("t-0")!.children.map((child) => child.id)).toEqual([
      "t-p-0",
    ]);
    expect(editor.document.map((block) => block.id)).toEqual([
      "t-0",
      "t-p-1",
      "trailing",
    ]);
    // The escape must leave the title intact.
    expect(editor.getBlock("t-0")!.content).toEqual([
      { type: "text", text: "Title", styles: {} },
    ]);
  });

  it("Delete at the end of the title pulls the first child's content up", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "toggle",
        id: "t-0",
        content: "Title",
        children: [
          { id: "t-p-0", type: "paragraph", content: "First" },
          { id: "t-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);

    await pressKey("Delete", { block: "t-0", placement: "end" });

    const toggle = editor.getBlock("t-0")!;
    expect(toggle.content).toEqual([
      { type: "text", text: "TitleFirst", styles: {} },
    ]);
    expect(toggle.children.map((child) => child.id)).toEqual(["t-p-1"]);
  });

  it("Delete at the end of the title of a container that must keep a child", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "toggle",
        id: "t-0",
        content: "Title",
        children: [{ id: "t-p-0", type: "paragraph", content: "Only" }],
      },
    ]);

    await pressKey("Delete", { block: "t-0", placement: "end" });

    const toggle = editor.getBlock("t-0")!;
    expect(toggle.content).toEqual([
      { type: "text", text: "TitleOnly", styles: {} },
    ]);
    // With `min: 1`, the schema refills the emptied children node.
    expect(toggle.children).toHaveLength(1);
    expect(toggle.children[0].content).toEqual([]);
  });

  it("Delete in a childless container does not throw", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "optionalToggle",
        id: "t-0",
        content: "Title",
        children: [],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);

    await pressKey("Delete", { block: "t-0", placement: "end" });

    // Delete at the end of a childless container's title reaches past it to
    // the next block. The real check is that it doesn't throw; asserting a
    // change guards against the keypress never arriving.
    expect(editor.getBlock("t-0")!.content).toEqual([
      { type: "text", text: "TitleAfter", styles: {} },
    ]);
  });

  it("Delete pulling a deeply-nested leaf out lands the caret in the moved block", async () => {
    // The pulled leaf is two container levels deep, so a caret set from its
    // pre-move position (before the source container is drained/repaired) would
    // land in the wrong block. The caret must follow the moved block.
    editor.replaceBlocks(editor.document, [
      { id: "before", type: "paragraph", content: "Before" },
      {
        id: "outer",
        type: "callout",
        children: [
          {
            id: "inner",
            type: "callout",
            children: [{ id: "deep", type: "paragraph", content: "Deep" }],
          },
        ],
      },
    ]);

    await pressKey("Delete", { block: "before", placement: "end" });

    expect(editor.getTextCursorPosition().block.id).toBe("deep");
    expect(editor.getParentBlock("deep")).toBeUndefined();
  });

  it("Backspace merging the first child into the title repairs the container", async () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "g-0",
        type: "titledGrid",
        content: "",
        children: [
          { id: "g-p-0", type: "paragraph", content: "" },
          { id: "g-p-1", type: "paragraph", content: "B" },
        ],
      },
    ]);

    await pressKey("Backspace", { block: "g-p-0", placement: "start" });

    // Merging the first child into the (empty) title drops the grid below its
    // `min`; with the title still empty, the unwrap repair collapses it rather
    // than leaving a padded empty child behind.
    expect(editor.getBlock("g-0")).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toContain("g-p-1");
  });
});
