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
import { containerSchema } from "./containers.fixture.js";

// The halves of the container-block story that need a real browser, split off
// from the (node) `containers.test.ts`:
//
//  - the keymap, which tiptap can only reach through a mounted view. These used
//    to synthesize a `KeyboardEvent` and hand it to `handleKeyDown` directly,
//    which passes whether or not a real keypress ever gets there. Here the
//    editor is mounted and focused and the keys are pressed for real.
//  - HTML/markdown serialization, which builds and parses real DOM.

const schema = containerSchema;

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
    { id: "p-1", type: "paragraph", content: "Paragraph 1" },
  ]);
});

/** Puts the caret where the test wants it and presses the key for real. */
async function pressKey(
  key: string,
  at: { block: string; placement: "start" | "end" },
) {
  editor.setTextCursorPosition(at.block, at.placement);
  editor.focus();
  await userEvent.keyboard(`{${key}}`);
}

describe("children keyboard handling", () => {
  it("Enter on an empty last child escapes the container", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "callout",
        id: "c-0",
        children: [
          { id: "c-p-0", type: "paragraph", content: "Hello" },
          { id: "c-p-1", type: "paragraph", content: "" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    await pressKey("Enter", { block: "c-p-1", placement: "end" });

    // The empty block has moved out of the callout, becoming its next sibling.
    const callout = editor.getBlock("c-0")!;
    expect(callout.children.map((child) => child.id)).toEqual(["c-p-0"]);
    expect(editor.document.map((block) => block.type)).toEqual([
      "callout",
      "paragraph",
      "paragraph",
    ]);
    expect(editor.document.map((block) => block.id)).toEqual([
      "c-0",
      "c-p-1",
      "trailing",
    ]);
    // The caret came with it, so typing continues outside the container.
    expect(editor.getTextCursorPosition().block.id).toBe("c-p-1");
  });

  it("Enter escape ascends past levels that can't hold the block", async () => {
    // A grid holds only cells, so a block escaping the last cell can't stop
    // at the grid level — it lands below the grid itself.
    editor.replaceBlocks(editor.document, [
      {
        type: "grid",
        id: "g-0",
        children: [
          {
            type: "gridCell",
            id: "g-c-0",
            children: [{ id: "g-p-0", type: "paragraph", content: "A" }],
          },
          {
            type: "gridCell",
            id: "g-c-1",
            children: [
              { id: "g-p-1", type: "paragraph", content: "B" },
              { id: "g-p-2", type: "paragraph", content: "" },
            ],
          },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    await pressKey("Enter", { block: "g-p-2", placement: "end" });

    expect(editor.getBlock("g-c-1")!.children.map((child) => child.id)).toEqual(
      ["g-p-1"],
    );
    expect(editor.document.map((block) => block.id)).toEqual([
      "g-0",
      "g-p-2",
      "trailing",
    ]);
    expect(editor.getTextCursorPosition().block.id).toBe("g-p-2");
  });

  it("Enter on an empty block mid-container stays inside", async () => {
    // The escape gesture is strictly "at the end of the container": an empty
    // block with siblings after it never ejects.
    editor.replaceBlocks(editor.document, [
      {
        type: "callout",
        id: "c-0",
        children: [
          { id: "c-p-0", type: "paragraph", content: "Hello" },
          { id: "c-p-1", type: "paragraph", content: "" },
          { id: "c-p-2", type: "paragraph", content: "World" },
        ],
      },
    ]);

    await pressKey("Enter", { block: "c-p-1", placement: "end" });

    expect(editor.document.map((block) => block.id)).toEqual(["c-0"]);
    expect(editor.getBlock("c-0")!.children).toHaveLength(4);
  });

  it("Backspace at the start of a container's first child moves it out", async () => {
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

    // The first child has moved out, above the callout, with its text intact.
    expect(editor.getBlock("c-0")!.children.map((child) => child.id)).toEqual([
      "c-p-1",
    ]);
    expect(editor.document.map((block) => block.id)).toEqual([
      "before",
      "c-p-0",
      "c-0",
    ]);
    expect(editor.getBlock("c-p-0")!.content).toEqual([
      { type: "text", text: "First", styles: {} },
    ]);
  });

  it("Backspace at the start of a block after a container moves it inside", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "callout",
        id: "c-0",
        children: [{ id: "c-p-0", type: "paragraph", content: "In callout" }],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);

    await pressKey("Backspace", { block: "after", placement: "start" });

    expect(editor.getBlock("c-0")!.children.map((child) => child.id)).toEqual([
      "c-p-0",
      "after",
    ]);
    expect(editor.document.map((block) => block.id)).toEqual(["c-0"]);
    expect(editor.getBlock("after")!.content).toEqual([
      { type: "text", text: "After", styles: {} },
    ]);
  });

  it("Delete at the end of a block before a container pulls its first child out", async () => {
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

    await pressKey("Delete", { block: "before", placement: "end" });

    expect(editor.document.map((block) => block.id)).toEqual([
      "before",
      "c-p-0",
      "c-0",
    ]);
    expect(editor.getBlock("c-0")!.children.map((child) => child.id)).toEqual([
      "c-p-1",
    ]);
  });

  it("Delete at the end of a container's last child pulls the next block in", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "callout",
        id: "c-0",
        children: [{ id: "c-p-0", type: "paragraph", content: "In callout" }],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);

    await pressKey("Delete", { block: "c-p-0", placement: "end" });

    expect(editor.getBlock("c-0")!.children.map((child) => child.id)).toEqual([
      "c-p-0",
      "after",
    ]);
    expect(editor.document.map((block) => block.id)).toEqual(["c-0"]);
  });
});

// The mirror suite for `boundary: "sealed"`: every implicit crossing the open
// cases above demonstrate must be a no-op on a sealed container, while edits
// *within* the container keep working.
describe("sealed boundary keyboard handling", () => {
  function documentShape() {
    return editor.document.map((block) => [
      block.id,
      block.children.map((child) => child.id),
    ]);
  }

  it("Backspace at the start of the first child does not move it out", async () => {
    editor.replaceBlocks(editor.document, [
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "sealedBox",
        id: "s-0",
        children: [
          { id: "s-p-0", type: "paragraph", content: "First" },
          { id: "s-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);
    const shape = documentShape();

    await pressKey("Backspace", { block: "s-p-0", placement: "start" });

    expect(documentShape()).toEqual(shape);
    // The keystroke was swallowed, so the caret also stayed put.
    expect(editor.getTextCursorPosition().block.id).toBe("s-p-0");
  });

  it("Backspace at the start of the second child still merges within", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "sealedBox",
        id: "s-0",
        children: [
          { id: "s-p-0", type: "paragraph", content: "First" },
          { id: "s-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);

    await pressKey("Backspace", { block: "s-p-1", placement: "start" });

    // Asserted as a change, so the suite can't pass by keystrokes never
    // arriving: the two children merged into one block.
    const children = editor.getBlock("s-0")!.children;
    expect(children).toHaveLength(1);
    expect(children[0].content).toEqual([
      { type: "text", text: "FirstSecond", styles: {} },
    ]);
  });

  it("Backspace after the container does not move the block inside", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "sealedBox",
        id: "s-0",
        children: [{ id: "s-p-0", type: "paragraph", content: "Sealed" }],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);
    const shape = documentShape();

    await pressKey("Backspace", { block: "after", placement: "start" });

    expect(documentShape()).toEqual(shape);
    // With no way in, the fallback node-selects the container, so a second
    // Backspace deletes it explicitly.
    const selection = editor.transact((tr) => tr.selection);
    expect("node" in selection && (selection.node as any).type.name).toBe(
      "sealedBox",
    );
  });

  it("Backspace after the container does not replace its trailing empty block", async () => {
    // The previous case falls through the "descend into the previous
    // container" branch; this one targets the "previous block is empty"
    // branch, which descends to the *bottom nested* block — here the empty
    // paragraph inside the sealed container.
    editor.replaceBlocks(editor.document, [
      {
        type: "sealedBox",
        id: "s-0",
        children: [
          { id: "s-p-0", type: "paragraph", content: "Sealed" },
          { id: "s-p-1", type: "paragraph", content: "" },
        ],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);
    const shape = documentShape();

    await pressKey("Backspace", { block: "after", placement: "start" });

    expect(documentShape()).toEqual(shape);
  });

  it("Delete before the container does not pull its first child out", async () => {
    editor.replaceBlocks(editor.document, [
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "sealedBox",
        id: "s-0",
        children: [
          { id: "s-p-0", type: "paragraph", content: "First" },
          { id: "s-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);
    const shape = documentShape();

    await pressKey("Delete", { block: "before", placement: "end" });

    expect(documentShape()).toEqual(shape);
  });

  it("Delete at the end of the last child does not pull the next block in", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "sealedBox",
        id: "s-0",
        children: [{ id: "s-p-0", type: "paragraph", content: "Sealed" }],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);
    const shape = documentShape();

    await pressKey("Delete", { block: "s-p-0", placement: "end" });

    expect(documentShape()).toEqual(shape);
  });

  it("Delete at the end of a nested last block does not reach past the boundary", async () => {
    // The climb in "delete next block at any level" starts from a *nested*
    // block, where the direct last-child branch doesn't apply — without its
    // own gate, Delete here would consume "after" into the sealed container.
    editor.replaceBlocks(editor.document, [
      {
        type: "sealedBox",
        id: "s-0",
        children: [
          {
            id: "s-p-0",
            type: "paragraph",
            content: "Parent",
            children: [{ id: "s-n-0", type: "paragraph", content: "Nested" }],
          },
        ],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);
    const shape = documentShape();

    await pressKey("Delete", { block: "s-n-0", placement: "end" });

    expect(documentShape()).toEqual(shape);
  });

  it("Backspace after an isolated container of sealed ones selects it", async () => {
    // The table shape: the grid itself is not sealed, but everywhere a
    // descent could land is sealed — so the block can't move in, and the
    // grid is selected for an explicit second-Backspace delete instead.
    editor.replaceBlocks(editor.document, [
      {
        type: "sealedGrid",
        id: "g-0",
        children: [
          {
            type: "sealedBox",
            id: "g-c-0",
            children: [{ id: "g-p-0", type: "paragraph", content: "Cell" }],
          },
        ],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);
    const shape = documentShape();

    await pressKey("Backspace", { block: "after", placement: "start" });

    expect(documentShape()).toEqual(shape);
    const selection = editor.transact((tr) => tr.selection);
    expect("node" in selection && (selection.node as any).type.name).toBe(
      "sealedGrid",
    );
  });

  it("Delete before an isolated container of sealed ones does not pull from it", async () => {
    editor.replaceBlocks(editor.document, [
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "sealedGrid",
        id: "g-0",
        children: [
          {
            type: "sealedBox",
            id: "g-c-0",
            children: [{ id: "g-p-0", type: "paragraph", content: "Cell" }],
          },
        ],
      },
    ]);
    const shape = documentShape();

    await pressKey("Delete", { block: "before", placement: "end" });

    expect(documentShape()).toEqual(shape);
  });

  it("Enter on an empty last child stays inside the container", async () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "sealedBox",
        id: "s-0",
        children: [
          { id: "s-p-0", type: "paragraph", content: "Hello" },
          { id: "s-p-1", type: "paragraph", content: "" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    await pressKey("Enter", { block: "s-p-1", placement: "end" });

    // A new block was created inside — a sealed boundary means Enter never
    // moves content out, so there is no double-Enter escape here.
    expect(editor.document.map((block) => block.type)).toEqual([
      "sealedBox",
      "paragraph",
    ]);
    const children = editor.getBlock("s-0")!.children;
    expect(children).toHaveLength(3);
    expect(editor.getTextCursorPosition().block.id).toBe(children[2].id);
  });
});

describe("children conversion", () => {
  it("round-trips a container through full (internal) HTML", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "callout" as const,
        id: "c-0",
        props: { flavor: "warning" as const },
        children: [
          { id: "c-p-0", type: "paragraph" as const, content: "In callout" },
        ],
      },
    ]);

    const html = editor.blocksToFullHTML(editor.document);
    expect(html).toContain('data-node-type="callout"');

    const parsed = editor.tryParseHTMLToBlocks(html);
    expect(parsed[0].type).toBe("callout");
    expect((parsed[0].props as any).flavor).toBe("warning");
    expect(parsed[0].children).toHaveLength(1);
    expect(parsed[0].children[0].type).toBe("paragraph");
  });

  it("exports containers to external HTML with type + prop attributes", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "callout",
        id: "c-0",
        props: { flavor: "warning" },
        children: [{ id: "c-p-0", type: "paragraph", content: "In callout" }],
      },
    ]);

    const html = editor.blocksToHTMLLossy(editor.document);
    expect(html).toContain('data-node-type="callout"');
    expect(html).toContain('data-flavor="warning"');
    // Container output is not wrapped in a blockContent div.
    expect(html).not.toContain("bn-block-content");
  });

  it("flattens containers to their children in markdown export", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "callout",
        id: "c-0",
        children: [
          { id: "c-p-0", type: "paragraph", content: "In callout" },
          { id: "c-p-1", type: "heading", content: "Heading in callout" },
        ],
      },
    ]);

    const markdown = editor.blocksToMarkdownLossy(editor.document);
    expect(markdown).toContain("In callout");
    expect(markdown).toContain("# Heading in callout");
  });
});
