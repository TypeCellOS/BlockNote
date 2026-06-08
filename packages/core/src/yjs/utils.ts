import { fragmentToPm, pmToFragment } from "@y/prosemirror";
import * as Y from "@y/y";
import { EditorState } from "prosemirror-state";

import {
  type Block,
  type BlockNoteEditor,
  type BlockSchema,
  type InlineContentSchema,
  type PartialBlock,
  type StyleSchema,
  blockToNode,
  docToBlocks,
} from "../index.js";

/**
 * Turn Prosemirror JSON to BlockNote style JSON
 * @param editor BlockNote editor
 * @param json Prosemirror JSON
 * @returns BlockNote style JSON
 */
export function _prosemirrorJSONToBlocks<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, ISchema, SSchema>, json: any) {
  // note: theoretically this should also be possible without creating prosemirror nodes,
  // but this is definitely the easiest way
  const doc = editor.pmSchema.nodeFromJSON(json);
  return docToBlocks<BSchema, ISchema, SSchema>(doc);
}

/**
 * Turn BlockNote JSON to Prosemirror node / state
 * @param editor BlockNote editor
 * @param blocks BlockNote blocks
 * @returns Prosemirror root node
 */
export function _blocksToProsemirrorNode<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  blocks: PartialBlock<BSchema, ISchema, SSchema>[],
) {
  const pmNodes = blocks.map((b) => blockToNode(b, editor.pmSchema));

  const doc = editor.pmSchema.topNodeType.create(
    null,
    editor.pmSchema.nodes["blockGroup"].create(null, pmNodes),
  );
  return doc;
}

/** YJS / BLOCKNOTE conversions */

/**
 * Turn a Y.XmlFragment collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
 * @param editor BlockNote editor
 * @param xmlFragment Y.XmlFragment
 * @returns BlockNote document (BlockNote style JSON of all blocks)
 */
export function yXmlFragmentToBlocks<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  xmlFragment: Y.Type,
) {
  // A degenerate empty document (`[]` round-tripped through Yjs) is stored as a
  // single empty `blockGroup`. That is schema-invalid (`blockContainer+`) and
  // cannot be rebuilt via step-validated apply, so detect and short-circuit it.
  // The editor never produces an empty doc, so this only guards the [] case.
  const topChild =
    xmlFragment.length === 1
      ? (xmlFragment.get(0) as Y.Type | undefined)
      : undefined;
  if (xmlFragment.length === 0 || (topChild != null && topChild.length === 0)) {
    return [] as ReturnType<typeof docToBlocks<BSchema, ISchema, SSchema>>;
  }

  // Build a headless PM document from the Yjs type via `fragmentToPm`, which
  // diffs the fragment against an empty EditorState doc and applies the result.
  // We deliberately do NOT use the lib's direct `fragmentToPmNode` here: it
  // calls `schema.nodes.doc.createAndFill`, which BlockNote monkey-patches to
  // force the first block's id to "initialBlockId" (see BlockNoteEditor.ts),
  // corrupting round-trips. The diff path never calls `createAndFill`.
  const state = EditorState.create({ schema: editor.pmSchema });
  const pmNode = fragmentToPm(xmlFragment, state.tr);
  return docToBlocks<BSchema, ISchema, SSchema>(pmNode);
}

/**
 * Convert blocks to a Y.XmlFragment
 *
 * This can be used when importing existing content to Y.Doc for the first time,
 * note that this should not be used to rehydrate a Y.Doc from a database once
 * collaboration has begun as all history will be lost
 *
 * @param editor BlockNote editor
 * @param blocks the blocks to convert
 * @param xmlFragment XML fragment name
 * @returns Y.XmlFragment
 */
export function blocksToYXmlFragment<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  blocks: Block<BSchema, ISchema, SSchema>[],
  xmlFragment?: Y.Type,
) {
  // In Yjs v14, content is written by applying a delta to a doc-attached type.
  // When no target type is supplied, attach a fresh one to a throwaway Y.Doc.
  return pmToFragment(
    _blocksToProsemirrorNode(editor, blocks),
    xmlFragment ?? new Y.Doc().get("prosemirror"),
  );
}

/**
 * Turn a Y.Doc collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
 * @param editor BlockNote editor
 * @param ydoc Y.Doc
 * @param xmlFragment XML fragment name
 * @returns BlockNote document (BlockNote style JSON of all blocks)
 */
export function yDocToBlocks<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  ydoc: Y.Doc,
  xmlFragment = "prosemirror",
) {
  return yXmlFragmentToBlocks(editor, ydoc.get(xmlFragment));
}

/**
 * This can be used when importing existing content to Y.Doc for the first time,
 * note that this should not be used to rehydrate a Y.Doc from a database once
 * collaboration has begun as all history will be lost
 *
 * @param editor BlockNote editor
 * @param blocks the blocks to convert
 * @param xmlFragment XML fragment name
 */
export function blocksToYDoc<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  blocks: PartialBlock<BSchema, ISchema, SSchema>[],
  xmlFragment = "prosemirror",
) {
  const doc = new Y.Doc();
  pmToFragment(_blocksToProsemirrorNode(editor, blocks), doc.get(xmlFragment));
  return doc;
}
