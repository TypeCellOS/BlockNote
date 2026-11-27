import { describe, expect, expectTypeOf, vi } from "vite-plus/test";
import { createExtension } from "./BlockNoteExtension.js";
import { BlockNoteEditor } from "./BlockNoteEditor.js";
import { en } from "../i18n/locales/en.js";

it("creates an editor with a paragraph", async ({ setupEditor }) => {
  const { editor } = await setupEditor();
  expect(editor.document).toHaveLength(1);
  expect(editor.document[0].type).toBe("paragraph");
});

it("immediately replaces doc", async ({ setupEditor }) => {
  const { editor } = await setupEditor();
  editor.replaceBlocks(editor.document, [
    { type: "paragraph", content: "This is a normal text" },
    { type: "heading", content: "And this is a large heading" },
  ]);
  expect(editor.document).toMatchInlineSnapshot(`
    [
      {
        "children": [],
        "content": [
          {
            "styles": {},
            "text": "This is a normal text",
            "type": "text",
          },
        ],
        "id": "1",
        "props": {
          "backgroundColor": "default",
          "textAlignment": "left",
          "textColor": "default",
        },
        "type": "paragraph",
      },
      {
        "children": [],
        "content": [
          {
            "styles": {},
            "text": "And this is a large heading",
            "type": "text",
          },
        ],
        "id": "2",
        "props": {
          "backgroundColor": "default",
          "isToggleable": false,
          "level": 1,
          "textAlignment": "left",
          "textColor": "default",
        },
        "type": "heading",
      },
    ]
  `);
});

it("updates block content", async ({ setupEditor }) => {
  const { editor } = await setupEditor();
  editor.updateBlock(editor.document[0], { content: "hello" });
  expect(editor.document[0].content).toEqual([
    { type: "text", text: "hello", styles: {} },
  ]);
});

it("narrows block prop types by block type", async ({ setupEditor }) => {
  const { editor } = await setupEditor();
  type Block = (typeof editor.document)[number];
  expectTypeOf<
    Extract<Block, { type: "paragraph" }>["props"]
  >().not.toHaveProperty("level");
  expectTypeOf<Extract<Block, { type: "heading" }>["props"]>().toHaveProperty(
    "level",
  );
});

it("reuses complete dictionaries without copying them", async ({
  setupEditor,
}) => {
  const dictionary = {
    ...en,
    emoji_picker: { search: "", loading: "Wait", search_no_results: "None" },
  };
  const { editor } = await setupEditor({ dictionary });
  const { editor: defaultEditor } = await setupEditor();
  expect(editor.dictionary).toBe(dictionary);
  expect(editor.dictionary.emoji_picker).toBe(dictionary.emoji_picker);
  expect(defaultEditor.dictionary).toBe(en);
});

it("emits destroy once, including listeners registered during extension initialization", () => {
  const onDestroy = vi.fn();
  const LifecycleExtension = createExtension(({ editor }) => {
    editor.on("destroy", onDestroy);
    return { key: "lifecycle" };
  });
  const editor = BlockNoteEditor.create({ extensions: [LifecycleExtension()] });
  try {
    editor.unmount();
    expect(onDestroy).not.toHaveBeenCalled();
    editor._tiptapEditor.destroy();
    expect(onDestroy).toHaveBeenCalledExactlyOnceWith();
    editor._tiptapEditor.destroy();
    expect(onDestroy).toHaveBeenCalledTimes(1);
  } finally {
    editor._tiptapEditor.destroy();
  }
});

it("can unsubscribe a destroy listener", () => {
  const editor = BlockNoteEditor.create();
  const onDestroy = vi.fn();
  const retainedListener = vi.fn();
  editor.on("destroy", retainedListener);
  const unsubscribe = editor.on("destroy", onDestroy);
  unsubscribe();
  editor._tiptapEditor.destroy();
  expect(onDestroy).not.toHaveBeenCalled();
  expect(retainedListener).toHaveBeenCalledExactlyOnceWith();
});

// Tiptap adds the plugins of the extensions only when the editor mounts. The
// unique ID plugin must also run before that: each block needs its own ID.
describe("block IDs in an editor without a view", () => {
  it("gives an ID to the block that fills an emptied document", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [{ id: "a", type: "paragraph", content: "Alpha" }],
    });

    editor.removeBlocks(editor.document);

    // The ID in `editor.document` must be the ID of the block in the editor:
    // only then can the other functions of the editor find the block.
    const [block] = editor.document;
    expect(editor.getBlock(block.id)).toEqual(block);
    editor.updateBlock(block.id, { content: "Beta" });
    expect(editor.document).toMatchObject([
      { id: block.id, content: [{ text: "Beta" }] },
    ]);
  });

  it("gives a new ID to the second block when a transaction splits a block", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [{ id: "a", type: "paragraph", content: "Alpha" }],
    });

    // Splits the paragraph and its block after "Al". ProseMirror copies the
    // attributes, so the two blocks have the ID "a" after the split.
    editor.transact((tr) => tr.split(5, 2));

    expect(editor.document).toMatchObject([
      { id: "a", content: [{ text: "Al" }] },
      { id: expect.not.stringMatching(/^a$/), content: [{ text: "pha" }] },
    ]);
  });
});
