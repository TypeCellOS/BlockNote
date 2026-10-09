/**
 * @vitest-environment jsdom
 */

import { Node } from "prosemirror-model";
import { afterEach, beforeAll, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { YAttributionMarksExtension } from "../../../y/extensions/YAttributionMarks.js";

// Track editors created in each test so we can unmount them in afterEach —
// otherwise prosemirror-view's DOMObserver leaves a setTimeout alive that
// fires after vitest tears down jsdom, throwing
// `ReferenceError: document is not defined` and failing the run.
const activeEditors: BlockNoteEditor<any, any, any>[] = [];

afterEach(() => {
  while (activeEditors.length) {
    activeEditors.pop()!.unmount();
  }
});

/**
 * The UniqueID extension's `appendTransaction` hook assigns a fresh id to any
 * newly-inserted node whose id duplicates an existing one. The one exception is
 * suggested-deletion nodes (carrying a `y-attributed-delete` mark): in
 * suggestion mode, Yjs keeps the deleted node in the document with the SAME id
 * as the surviving node, and rewriting that id would corrupt the suggestion.
 * These tests exercise both branches.
 */

function createEditor() {
  // The suggested-deletion cases mark nodes with `y-attributed-delete`, which
  // only exists in the schema when the suggestion-marks bundle is loaded.
  const editor = BlockNoteEditor.create({
    extensions: [YAttributionMarksExtension()],
  });
  editor.mount(document.createElement("div"));
  activeEditors.push(editor);
  editor.replaceBlocks(editor.document, [
    { id: "block-a", type: "paragraph", content: "A" },
    { id: "block-b", type: "paragraph", content: "B" },
  ]);
  return editor;
}

/**
 * Builds a `blockContainer` node holding a single paragraph with the given
 * block `id`, optionally carrying a `y-attributed-delete` mark to simulate a
 * suggested deletion.
 */
function makeBlockContainer(
  editor: BlockNoteEditor,
  id: string,
  text: string,
  suggestedDelete: boolean,
) {
  const schema = editor.pmSchema;
  const paragraph = schema.nodes["paragraph"].createChecked(
    {},
    schema.text(text),
  );
  const marks = suggestedDelete
    ? [schema.marks["y-attributed-delete"].create({ id: 1 })]
    : undefined;

  return schema.nodes["blockContainer"].createChecked({ id }, paragraph, marks);
}

/** Returns the ids of all blockContainer nodes in document order. */
function getBlockIds(doc: Node) {
  const ids: (string | null)[] = [];
  doc.descendants((node) => {
    if (node.type.name === "blockContainer") {
      ids.push(node.attrs.id);
    }
    return true;
  });
  return ids;
}

describe("UniqueID: duplicate id handling", () => {
  let editor: BlockNoteEditor;

  beforeAll(() => {
    // Reset the mock id counter so generated ids are deterministic.
    (window as any).__TEST_OPTIONS = {};
  });

  it("assigns a fresh id to a newly-inserted plain block that duplicates another new block", () => {
    editor = createEditor();
    const view = editor._tiptapEditor.view;

    // Insert TWO new blocks sharing the same id "dup" in a single transaction.
    // Both land in the same changed range, so UniqueID detects the duplicate
    // and rewrites one of them with a fresh generated id.
    const dup1 = makeBlockContainer(editor, "dup", "Dup 1", false);
    const dup2 = makeBlockContainer(editor, "dup", "Dup 2", false);

    // Position at the boundary between the first block and the second block
    // inside the blockGroup.
    const firstBlock = view.state.doc.firstChild!.firstChild!;
    const insertPos = firstBlock.nodeSize + 1;

    view.dispatch(view.state.tr.insert(insertPos, [dup1, dup2]));

    const ids = getBlockIds(view.state.doc);

    // Four blocks now exist, and UniqueID has resolved the duplicate so that
    // all ids are distinct and non-null.
    expect(ids).toHaveLength(4);
    expect(ids.every((id) => id !== null)).toBe(true);
    expect(new Set(ids).size).toBe(4);
  });

  it("keeps the shared id of a suggested-deletion block and its surviving copy", () => {
    editor = createEditor();
    const view = editor._tiptapEditor.view;

    // Insert two new blocks sharing the id "dup" in a single transaction: a
    // plain (live) one and a suggested-deletion one (y-attributed-delete mark).
    // This is how a version diff shows a re-created block (a type change or a
    // move): the deleted original next to its copy, with the same id. Neither
    // id is rewritten, otherwise the shown copy gets a different id.
    const liveDup = makeBlockContainer(editor, "dup", "Live dup", false);
    const deletedDup = makeBlockContainer(editor, "dup", "Deleted dup", true);

    const firstBlock = view.state.doc.firstChild!.firstChild!;
    const insertPos = firstBlock.nodeSize + 1;

    view.dispatch(view.state.tr.insert(insertPos, [liveDup, deletedDup]));

    expect(getBlockIds(view.state.doc)).toEqual([
      "block-a",
      "dup",
      "dup",
      "block-b",
    ]);
  });

  it("exposes distinct ids in editor.document even though two ProseMirror nodes share the same id", () => {
    editor = createEditor();
    const view = editor._tiptapEditor.view;

    // Insert a suggested-deletion copy of the FIRST block, sharing its id
    // "block-a". This mirrors suggestion mode: Yjs keeps the deleted node in
    // the document with the same id as the surviving node, and UniqueID leaves
    // that duplicate id untouched.
    const deletedCopy = makeBlockContainer(
      editor,
      "block-a",
      "A deleted copy",
      true,
    );

    const firstBlock = view.state.doc.firstChild!.firstChild!;
    const insertPos = firstBlock.nodeSize + 1;

    view.dispatch(view.state.tr.insert(insertPos, deletedCopy));

    // At the ProseMirror level, two nodes now share the id "block-a": the live
    // one and the suggested-deletion one.
    const pmIds = getBlockIds(view.state.doc);
    expect(pmIds.filter((id) => id === "block-a")).toHaveLength(2);

    // But editor.document disambiguates them via getNodeId: the suggested
    // deletion node is reported as "block-a-1", so all block ids are distinct.
    const docIds = editor.document.map((block) => block.id);
    expect(docIds).toContain("block-a");
    expect(docIds).toContain("block-a-1");
    expect(new Set(docIds).size).toBe(docIds.length);
  });
});
