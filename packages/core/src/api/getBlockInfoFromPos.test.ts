import { Schema } from "prosemirror-model";
import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { docToBlocks } from "./nodeConversions/nodeToBlock.js";
import { getNodeId } from "./getBlockInfoFromPos.js";
import { YSuggestionMarksExtension } from "../y/extensions/YSuggestionMarks.js";

/**
 * Builds a `blockContainer` node holding a single paragraph with the given
 * block `id`. When `suggestedDelete` is true, the container carries a
 * `y-attributed-delete` mark, simulating a node that Yjs keeps in the document
 * (in suggestion mode) after it has been deleted.
 */
function makeBlockContainer(
  schema: Schema,
  id: string,
  text: string,
  suggestedDelete: boolean,
) {
  const paragraph = schema.nodes["paragraph"].createChecked(
    {},
    text ? schema.text(text) : null,
  );
  const marks = suggestedDelete
    ? [schema.marks["y-attributed-delete"].create({ id: 1 })]
    : undefined;

  return schema.nodes["blockContainer"].createChecked({ id }, paragraph, marks);
}

describe("getNodeId", () => {
  let editor: BlockNoteEditor;

  // We only need the editor's ProseMirror schema to construct nodes, so a
  // single non-mounted editor instance is enough for all cases here.
  function getSchema() {
    if (!editor) {
      editor = BlockNoteEditor.create({
        extensions: [YSuggestionMarksExtension()],
      });
    }
    return editor.pmSchema;
  }

  it("returns the plain id for a normal block", () => {
    const schema = getSchema();
    const block = makeBlockContainer(schema, "0", "Hello", false);
    const doc = schema.nodes["doc"].createChecked(
      {},
      schema.nodes["blockGroup"].createChecked({}, block),
    );

    // The only descendant blockContainer with id "0" is the one we built.
    const blockContainer = doc.firstChild!.firstChild!;

    expect(getNodeId(blockContainer, doc)).toBe("0");
  });

  it("throws when a node has no id", () => {
    const schema = getSchema();
    // `create` (not `createChecked`) so we can omit the id attr default lying.
    const block = schema.nodes["blockContainer"].create(
      { id: null },
      schema.nodes["paragraph"].createChecked({}, schema.text("No id")),
    );

    expect(() => getNodeId(block, block)).toThrow(/does not have an ID/);
  });

  it("lies about the id of a suggested-deletion block to disambiguate duplicates", () => {
    const schema = getSchema();

    // First block: a "real" block with id "0".
    const liveBlock = makeBlockContainer(schema, "0", "Live", false);
    // Second block: a suggested deletion that, in suggestion mode, shares the
    // SAME id "0" as the live block but carries a y-attributed-delete mark.
    const deletedBlock = makeBlockContainer(schema, "0", "Deleted", true);

    const doc = schema.nodes["doc"].createChecked(
      {},
      schema.nodes["blockGroup"].createChecked({}, [liveBlock, deletedBlock]),
    );

    const blockGroup = doc.firstChild!;
    const liveNode = blockGroup.child(0);
    const deletedNode = blockGroup.child(1);

    // The live block keeps its plain id.
    expect(getNodeId(liveNode, doc)).toBe("0");
    // The suggested-deletion block is disambiguated: it is preceded by one
    // node with the same id, so its index is 1 -> "0-1".
    expect(getNodeId(deletedNode, doc)).toBe("0-1");
  });

  it("disambiguates multiple suggested-deletion blocks with the same id", () => {
    const schema = getSchema();

    // Three blocks all sharing id "0": one live block followed by two
    // suggested deletions (e.g. the user deleted the same logical block twice
    // across forks, all kept in the doc with the y-attributed-delete mark).
    const liveBlock = makeBlockContainer(schema, "0", "Live", false);
    const deletedBlock1 = makeBlockContainer(schema, "0", "Deleted 1", true);
    const deletedBlock2 = makeBlockContainer(schema, "0", "Deleted 2", true);

    const doc = schema.nodes["doc"].createChecked(
      {},
      schema.nodes["blockGroup"].createChecked({}, [
        liveBlock,
        deletedBlock1,
        deletedBlock2,
      ]),
    );

    const blockGroup = doc.firstChild!;

    expect(getNodeId(blockGroup.child(0), doc)).toBe("0");
    // Preceded by 1 node with the same id.
    expect(getNodeId(blockGroup.child(1), doc)).toBe("0-1");
    // Preceded by 2 nodes with the same id.
    expect(getNodeId(blockGroup.child(2), doc)).toBe("0-2");
  });

  it("counts only preceding same-id nodes, not unrelated blocks", () => {
    const schema = getSchema();

    // A block with a different id sits between the live and deleted blocks.
    // It must NOT contribute to the suggested-deletion block's index.
    const liveBlock = makeBlockContainer(schema, "0", "Live", false);
    const otherBlock = makeBlockContainer(schema, "1", "Other", false);
    const deletedBlock = makeBlockContainer(schema, "0", "Deleted", true);

    const doc = schema.nodes["doc"].createChecked(
      {},
      schema.nodes["blockGroup"].createChecked({}, [
        liveBlock,
        otherBlock,
        deletedBlock,
      ]),
    );

    const blockGroup = doc.firstChild!;

    expect(getNodeId(blockGroup.child(0), doc)).toBe("0");
    expect(getNodeId(blockGroup.child(1), doc)).toBe("1");
    // Only the single live block with id "0" precedes it -> index 1.
    expect(getNodeId(blockGroup.child(2), doc)).toBe("0-1");
  });

  it("throws when a suggested-deletion node is not found in the provided doc", () => {
    const schema = getSchema();

    // A suggested-deletion block that is NOT part of `doc` -> the walk never
    // finds it, so getNodeId throws.
    const orphanDeleted = makeBlockContainer(schema, "0", "Orphan", true);

    const doc = schema.nodes["doc"].createChecked(
      {},
      schema.nodes["blockGroup"].createChecked(
        {},
        makeBlockContainer(schema, "0", "Live", false),
      ),
    );

    expect(() => getNodeId(orphanDeleted, doc)).toThrow(
      /not found in document/,
    );
  });
});

describe("docToBlocks round trip with suggested deletions", () => {
  let editor: BlockNoteEditor;

  function getSchema() {
    if (!editor) {
      editor = BlockNoteEditor.create({
        extensions: [YSuggestionMarksExtension()],
      });
    }
    return editor.pmSchema;
  }

  it("reports distinct block ids even though two ProseMirror nodes share the same id", () => {
    const schema = getSchema();

    // A live block and a suggested-deletion block that, in suggestion mode,
    // share the SAME ProseMirror id "0".
    const liveBlock = makeBlockContainer(schema, "0", "Live", false);
    const deletedBlock = makeBlockContainer(schema, "0", "Deleted", true);

    const doc = schema.nodes["doc"].createChecked(
      {},
      schema.nodes["blockGroup"].createChecked({}, [liveBlock, deletedBlock]),
    );

    // At the ProseMirror level, both nodes share id "0".
    const blockGroup = doc.firstChild!;
    expect(blockGroup.child(0).attrs.id).toBe("0");
    expect(blockGroup.child(1).attrs.id).toBe("0");

    // docToBlocks disambiguates them via getNodeId: the live block keeps "0",
    // the suggested-deletion block becomes "0-1".
    const blocks = docToBlocks(doc);
    const ids = blocks.map((block) => block.id);

    expect(ids).toEqual(["0", "0-1"]);
    // All block ids are distinct.
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("disambiguates multiple suggested-deletion blocks sharing an id in docToBlocks", () => {
    const schema = getSchema();

    const liveBlock = makeBlockContainer(schema, "0", "Live", false);
    const deletedBlock1 = makeBlockContainer(schema, "0", "Deleted 1", true);
    const deletedBlock2 = makeBlockContainer(schema, "0", "Deleted 2", true);

    const doc = schema.nodes["doc"].createChecked(
      {},
      schema.nodes["blockGroup"].createChecked({}, [
        liveBlock,
        deletedBlock1,
        deletedBlock2,
      ]),
    );

    const blocks = docToBlocks(doc);
    const ids = blocks.map((block) => block.id);

    expect(ids).toEqual(["0", "0-1", "0-2"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only disambiguates the suggested-deletion block, leaving unrelated ids intact", () => {
    const schema = getSchema();

    const liveBlock = makeBlockContainer(schema, "0", "Live", false);
    const otherBlock = makeBlockContainer(schema, "1", "Other", false);
    const deletedBlock = makeBlockContainer(schema, "0", "Deleted", true);

    const doc = schema.nodes["doc"].createChecked(
      {},
      schema.nodes["blockGroup"].createChecked({}, [
        liveBlock,
        otherBlock,
        deletedBlock,
      ]),
    );

    const blocks = docToBlocks(doc);
    const ids = blocks.map((block) => block.id);

    expect(ids).toEqual(["0", "1", "0-1"]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
