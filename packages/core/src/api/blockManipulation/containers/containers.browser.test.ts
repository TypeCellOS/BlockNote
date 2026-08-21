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

// Keymap tests for container blocks, split off from the node-environment
// `containers.test.ts`. tiptap can only reach `handleKeyDown` through a
// mounted view, so the editor is mounted and focused here and the keys are
// pressed for real.

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

/** Puts the caret at the given position and presses the key. */
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
    // The caret moves out with the block.
    expect(editor.getTextCursorPosition().block.id).toBe("c-p-1");
  });

  it("Enter escape ascends past levels that can't hold the block", async () => {
    // A grid holds only cells, so a block escaping the last cell can't stop
    // at the grid level. It lands below the grid itself.
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
    // The escape only fires at the end of the container. An empty block with
    // siblings after it never ejects.
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

// Sealed-boundary counterparts to the open cases above. Every implicit
// crossing must be a no-op on a sealed container, while edits within the
// container keep working.
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

    // Asserting the merge guards against the suite passing because
    // keystrokes never arrive.
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
    // branch, which descends to the bottom nested block, here the empty
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
    // The climb in "delete next block at any level" starts from a nested
    // block, where the direct last-child branch doesn't apply. Without its
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
    // Same shape as tables: the grid itself is not sealed, but every place a
    // descent could land is sealed. The block can't move in, so the grid is
    // selected for an explicit second-Backspace delete instead.
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

    // A sealed boundary means Enter never moves content out, so there is no
    // double-Enter escape. The new block is created inside.
    expect(editor.document.map((block) => block.type)).toEqual([
      "sealedBox",
      "paragraph",
    ]);
    const children = editor.getBlock("s-0")!.children;
    expect(children).toHaveLength(3);
    expect(editor.getTextCursorPosition().block.id).toBe(children[2].id);
  });
});

// HTML round-trips (full, external, clipboard) live with the parse rules in
// `schema/blocks/containerParse.browser.test.ts`.
describe("children conversion", () => {
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
