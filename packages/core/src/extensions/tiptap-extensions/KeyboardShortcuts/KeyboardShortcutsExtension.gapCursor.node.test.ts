// @vitest-environment node
import { GapCursor } from "@tiptap/pm/gapcursor";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { getNodeById } from "../../../api/nodeUtil.js";
import { type PartialBlock } from "../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";

const editors: BlockNoteEditor[] = [];

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor._tiptapEditor.destroy();
  }
});

function createEditor(initialContent: PartialBlock[]) {
  const editor = BlockNoteEditor.create({
    initialContent,
    trailingBlock: false,
  });
  editors.push(editor);
  const view = editor.prosemirrorView;
  view.updateState(
    view.state.reconfigure({
      plugins: editor._tiptapEditor.extensionManager.plugins,
    }),
  );
  return editor;
}

function pressEnter(editor: BlockNoteEditor) {
  // The real keymaps only read these fields; no DOM or layout is needed.
  const event = { key: "Enter", keyCode: 13 } as KeyboardEvent;
  const view = editor.prosemirrorView;
  expect(
    view.state.plugins.some((plugin) =>
      plugin.props.handleKeyDown?.call(plugin, view, event),
    ),
  ).toBe(true);
  view.state.doc.check();
  expect(view.state.selection).toBeInstanceOf(TextSelection);
  expect(view.state.selection.$from.parent.type.name).toBe("paragraph");
}

describe("Enter at a gap cursor", () => {
  // Manual ArrowUp navigation produces the inner gap at position 2, before the
  // image content inside its blockContainer, not before the wrapper itself.
  // These node tests pin Enter's response, not browser arrow-key geometry.
  it.each(["image", "file", "video", "audio"] as const)(
    "inserts above the first %s without moving its children",
    (type) => {
      const editor = createEditor([
        { id: "media", type, children: [{ id: "child", content: "Child" }] },
        { id: "following", content: "Following" },
      ]);
      editor.transact((tr) => {
        tr.setSelection(new GapCursor(tr.doc.resolve(2)));
      });
      const original = editor.document;

      pressEnter(editor);

      expect(editor.document.map((block) => block.type)).toEqual([
        "paragraph",
        type,
        "paragraph",
      ]);
      expect(editor.document.slice(1)).toEqual(original);
      expect(editor.getTextCursorPosition().block.id).toBe(
        editor.document[0].id,
      );
    },
  );

  it.each([
    [1, 0], // Before the first wrapper.
    [2, 0], // Before the first image, inside its wrapper (the reported case).
    [3, 1], // After the image, inside its wrapper.
    [4, 1], // Between the wrappers.
    [5, 1], // Before the file, inside its wrapper.
    [6, 2], // After the final file, inside its wrapper.
  ])("inserts at gap %s as block %s", (pos, insertionIndex) => {
    const editor = createEditor([
      { id: "image", type: "image" },
      { id: "file", type: "file" },
    ]);
    editor.transact((tr) => {
      tr.setSelection(new GapCursor(tr.doc.resolve(pos)));
    });

    pressEnter(editor);

    const expected = ["image", "file"];
    expected.splice(insertionIndex, 0, "paragraph");
    expect(editor.document.map((block) => block.type)).toEqual(expected);
    expect(editor.getTextCursorPosition().block.id).toBe(
      editor.document[insertionIndex].id,
    );
  });

  it("inserts before a nested image without outdenting it", () => {
    const editor = createEditor([
      {
        id: "parent",
        content: "Parent",
        children: [{ id: "image", type: "image" }],
      },
    ]);
    const image = getNodeById("image", editor.prosemirrorState.doc)!;
    editor.transact((tr) => {
      tr.setSelection(new GapCursor(tr.doc.resolve(image.posBeforeNode + 1)));
    });

    pressEnter(editor);

    expect(editor.document).toHaveLength(1);
    expect(editor.document[0].children.map((block) => block.type)).toEqual([
      "paragraph",
      "image",
    ]);
    expect(editor.getTextCursorPosition().block.id).toBe(
      editor.document[0].children[0].id,
    );
  });

  it("still inserts below a node-selected image", () => {
    const editor = createEditor([{ id: "image", type: "image" }]);
    editor.transact((tr) => {
      tr.setSelection(NodeSelection.create(tr.doc, 2));
    });

    pressEnter(editor);

    expect(editor.document.map((block) => block.type)).toEqual([
      "image",
      "paragraph",
    ]);
  });
});
