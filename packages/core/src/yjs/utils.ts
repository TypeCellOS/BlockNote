import {
  prosemirrorToYDoc,
  prosemirrorToYXmlFragment,
  yXmlFragmentToProseMirrorRootNode,
} from "y-prosemirror";
import * as Y from "yjs";

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
 * Find a Y.AbstractType in another Y.Doc that corresponds to the same
 * logical type in the original doc.
 */
export function findTypeInOtherYdoc<T extends Y.AbstractType<any>>(
  ytype: T,
  otherYdoc: Y.Doc,
): T {
  const ydoc = ytype.doc;
  if (!ydoc) {
    throw new Error("type does not have a ydoc");
  }
  if (ytype._item === null) {
    const rootKey = Array.from(ydoc.share.keys()).find(
      (key) => ydoc.share.get(key) === ytype,
    );
    if (rootKey == null) {
      throw new Error("type does not exist in other ydoc");
    }
    return otherYdoc.get(rootKey, ytype.constructor as new () => T) as T;
  } else {
    const ytypeItem = ytype._item;
    const otherStructs = otherYdoc.store.clients.get(ytypeItem.id.client) ?? [];
    const itemIndex = Y.findIndexSS(otherStructs, ytypeItem.id.clock);
    const otherItem = otherStructs[itemIndex] as Y.Item | undefined;
    if (!otherItem) {
      throw new Error("type does not exist in other ydoc");
    }
    const otherContent = otherItem.content as Y.ContentType | undefined;
    if (!otherContent) {
      throw new Error("type does not exist in other ydoc");
    }
    return otherContent.type as T;
  }
}

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
  xmlFragment: Y.XmlFragment,
) {
  const pmNode = yXmlFragmentToProseMirrorRootNode(
    xmlFragment,
    editor.pmSchema,
  );
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
  xmlFragment?: Y.XmlFragment,
) {
  return prosemirrorToYXmlFragment(
    _blocksToProsemirrorNode(editor, blocks),
    xmlFragment,
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
  return yXmlFragmentToBlocks(editor, ydoc.getXmlFragment(xmlFragment));
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
  return prosemirrorToYDoc(
    _blocksToProsemirrorNode(editor, blocks),
    xmlFragment,
  );
}
