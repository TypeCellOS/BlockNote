import {
  type BlockNoteEditor,
  blockToNode,
  docToBlocks,
  type PartialBlock,
} from "@blocknote/core";
import type { Node } from "prosemirror-model";

import type { LensBlock } from "../model.js";
import { propsFit } from "../util/blocks/index.js";
import { fitTables } from "../fit/index.js";

/**
 * Returns the blocks in the form that the document stores them: through the
 * ProseMirror nodes of the schema of the editor, and back to Block JSON. A
 * block without an ID gets a new ID, and a missing field gets its default
 * value. ProseMirror can also change the content (for example the hard
 * breaks at the edge of a styled run). A table with a short row gets empty
 * cells, as the table plugin of the editor does (see `fitTable`). Thus,
 * blocks in this form compare equal to the blocks of the document.
 *
 * The fit of the tables is our own (`fitTables`), not `fixTables` of
 * prosemirror-tables: `fixTables` changes ProseMirror nodes, but core's
 * `blockToNode` already throws for a table whose spans do not fit, before a
 * node exists. `fixTables` can replace this fit after a change of core (the
 * spike `spike/fit-editor-logic`).
 *
 * Returns `undefined` if the blocks do not fit the schema, also in nested
 * blocks: for example a column outside a column list, or a prop value that is
 * not in the prop schema of the type.
 */
export function toStoredBlocks(
  editor: BlockNoteEditor<any, any, any>,
  blocks: readonly PartialBlock<any, any, any>[],
): LensBlock[] | undefined {
  const group = toBlockGroup(editor, blocks);
  return group === undefined
    ? undefined
    : fitTables(docToBlocks(editor.pmSchema.nodes["doc"].create(null, group)));
}

function toBlockGroup(
  editor: BlockNoteEditor<any, any, any>,
  blocks: readonly PartialBlock<any, any, any>[],
): Node | undefined {
  const schema = editor.pmSchema;
  try {
    if (!propsFit(editor.schema.blockSchema, blocks)) {
      return undefined;
    }
    const group = schema.nodes["blockGroup"].create(
      null,
      blocks.map((block) => blockToNode(block, schema)),
    );
    // An empty list of blocks is valid: the write removes all blocks.
    if (blocks.length > 0) {
      group.check();
    }
    return group;
  } catch {
    // `propsFit`, `blockToNode` and `check` throw for blocks that do not
    // fit the schema (for example `children` that are not an array). For
    // input from a client, this is an expected failure.
    return undefined;
  }
}
