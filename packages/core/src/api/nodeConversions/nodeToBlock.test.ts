import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { YAttributionMarksExtension } from "../../y/extensions/YAttributionMarks.js";
import { docToBlocks } from "./nodeToBlock.js";

/**
 * Builds a `blockContainer` holding a single paragraph with the given block
 * `id`. When `suggestedDelete` is true, the container carries a
 * `y-attributed-delete` mark, simulating a node that a suggestion / version
 * diff keeps in the document after it has been deleted — it shares its `id`
 * with the live node it was deleted from, and `getNodeId` disambiguates it
 * positionally ("0-1" = the deletion-marked node with 1 same-id node before
 * it).
 */
function makeBlockContainer(
  schema: Schema,
  id: string,
  text: string,
  suggestedDelete: boolean,
) {
  const paragraph = schema.nodes["paragraph"].createChecked(
    {},
    schema.text(text),
  );
  const marks = suggestedDelete
    ? [schema.marks["y-attributed-delete"].create({ userIds: ["A"] })]
    : undefined;
  return schema.nodes["blockContainer"].createChecked({ id }, paragraph, marks);
}

function createSuggestionEditor() {
  return BlockNoteEditor.create({
    extensions: [YAttributionMarksExtension()],
  });
}

/**
 * KNOWN LIMITATION (`it.fails`): the editor's `blockCache` (a
 * `WeakMap<Node, Block>`) is keyed by node object, which ProseMirror reuses
 * across doc versions — but a deletion-marked node's disambiguated id depends
 * on the *doc context* (how many same-id nodes precede it), which the cache
 * key cannot see, so it can serve stale (or aliased) ids. Accepted for now:
 * suggestion rendering is experimental and its fake-id scheme is slated for
 * rework — these tests are the contract that rework must satisfy (each
 * asserts the CORRECT behavior and currently fails; remove `.fails` then).
 */
describe("blockCache with suggested deletions", () => {
  it.fails("reports the node's current lying id after a preceding same-id block is deleted", () => {
    const editor = createSuggestionEditor();
    const schema = editor.pmSchema;
    const doc = schema.nodes["doc"].createChecked(
      {},
      schema.nodes["blockGroup"].createChecked({}, [
        makeBlockContainer(schema, "0", "Live", false),
        makeBlockContainer(schema, "1", "Other", false),
        makeBlockContainer(schema, "0", "Deleted", true),
      ]),
    );

    // First read populates the editor's blockCache (keyed by node object).
    expect(docToBlocks(doc).map((b) => b.id)).toEqual(["0", "1", "0-1"]);

    // Delete the live "0" block via a real transaction — ProseMirror reuses
    // the untouched sibling node objects in the new doc.
    const live = doc.firstChild!.child(0);
    const tr = EditorState.create({ doc }).tr.delete(1, 1 + live.nodeSize);

    // Sanity: the deleted-copy node object really is reused, so the second
    // read is a cache hit.
    expect(tr.doc.firstChild!.child(1)).toBe(doc.firstChild!.child(2));

    // The deleted copy now has zero same-id predecessors, so its current
    // lying id is "0-0" — a stale cache would still report "0-1".
    expect(docToBlocks(tr.doc).map((b) => b.id)).toEqual(["1", "0-0"]);
  });

  it.fails("keeps block ids unique when another same-id deleted copy is inserted", () => {
    const editor = createSuggestionEditor();
    const schema = editor.pmSchema;
    const doc = schema.nodes["doc"].createChecked(
      {},
      schema.nodes["blockGroup"].createChecked({}, [
        makeBlockContainer(schema, "0", "Live", false),
        makeBlockContainer(schema, "1", "Other", false),
        makeBlockContainer(schema, "0", "Deleted", true),
      ]),
    );

    // First read populates the blockCache: the old deleted copy is cached
    // with id "0-1".
    expect(docToBlocks(doc).map((b) => b.id)).toEqual(["0", "1", "0-1"]);

    // Insert ANOTHER deleted copy of "0" right after the live block. Its
    // fresh id is "0-1" (one same-id node before it), which bumps the OLD
    // deleted copy to "0-2".
    const live = doc.firstChild!.child(0);
    const tr = EditorState.create({ doc }).tr.insert(
      1 + live.nodeSize,
      makeBlockContainer(schema, "0", "Deleted again", true),
    );

    // Correct ids: ["0", "0-1", "1", "0-2"] — a stale cache would report the
    // old copy as "0-1" too, aliasing two different blocks to the same id.
    const ids = docToBlocks(tr.doc).map((b) => b.id);
    expect(ids).toEqual(["0", "0-1", "1", "0-2"]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
