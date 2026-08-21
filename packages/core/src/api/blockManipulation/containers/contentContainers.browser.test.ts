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

// The keymap half of the content-bearing container story, split off from the
// (node) `contentContainers.test.ts`. Tiptap can only reach `handleKeyDown`
// through a mounted view, and these used to synthesize a `KeyboardEvent` and
// call the handler directly — which passes whether or not a real keypress ever
// gets there. Here the editor is mounted and focused and the keys are pressed
// for real.
//
// Not ported: "Enter at the end of the title creates a new first child". That
// exact behaviour, caret included, is already covered against a real app in
// `tests/src/end-to-end/containerblocks/containerblocks.test.tsx`
// ("Creates a first child on Enter at the end of a container's content").

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

/** Puts the caret where the test wants it and presses the key for real. */
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

    // The title became a paragraph's content and the children came along as
    // that paragraph's children — nothing was destroyed.
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
    // `__children` node name — a plain block-type lookup misses it and lets
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
    // merging into it would stitch across its required `__children` node —
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

  it("Backspace still merges a sealed container's first child into its title", async () => {
    // Within the boundary nothing changes: the title and children are both
    // inside it.
    editor.replaceBlocks(editor.document, [
      {
        type: "sealedToggle",
        id: "st-0",
        content: "Title",
        children: [
          { id: "st-p-0", type: "paragraph", content: "First" },
          { id: "st-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);

    await pressKey("Backspace", { block: "st-p-0", placement: "start" });

    const toggle = editor.getBlock("st-0")!;
    expect(toggle.content).toEqual([
      { type: "text", text: "TitleFirst", styles: {} },
    ]);
    expect(toggle.children.map((child) => child.id)).toEqual(["st-p-1"]);
  });

  it("Backspace at the start of a pure container's first child still moves it out", async () => {
    // The control for the two cases above: a container with no title of its own
    // must keep the old behaviour.
    editor.replaceBlocks(editor.document, [
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "callout",
        id: "c-0",
        children: [
          { id: "c-p-0", type: "paragraph", content: "First" },
          { id: "c-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);

    await pressKey("Backspace", { block: "c-p-0", placement: "start" });

    expect(editor.getBlock("c-0")!.children.map((child) => child.id)).toEqual([
      "c-p-1",
    ]);
    expect(editor.document.map((block) => block.id)[1]).toBe("c-p-0");
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
    // The container kept its own title through the escape.
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
    // `min: 1` — the schema refills the emptied children node.
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

    // Delete at the end of a childless container's title reaches past it to the
    // next block. What matters is that it doesn't throw; asserted as a real
    // change so the test can't pass by the keypress never arriving.
    expect(editor.getBlock("t-0")!.content).toEqual([
      { type: "text", text: "TitleAfter", styles: {} },
    ]);
  });
});
