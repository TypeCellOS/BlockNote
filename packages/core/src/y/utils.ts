import {
  deltaAttributionToFormat,
  deltaToPNode,
  deltaToPSteps,
  docToDelta,
  nodeToDelta,
  pmToFragment,
} from "@y/prosemirror";
import * as d from "lib0/delta";
import { Node } from "prosemirror-model";
import { Transaction } from "prosemirror-state";
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
import { blockMatchNodes } from "./extensions/blockMatchNodes.js";
import { mapAttributionToMark } from "./extensions/YSync.js";

import * as Y from "@y/y";

/**
 * Find the equivalent of a Y.Type in another Y.Doc.
 *
 * For root types this looks up the matching shared key; for sub-types it
 * locates the item by its client/clock ID in the target doc's store.
 */
export function findTypeInOtherYdoc<T extends Y.Type<any>>(
  ytype: T,
  otherYdoc: Y.Doc,
): T {
  const ydoc = ytype.doc;
  if (!ydoc) {
    throw new Error("type does not have a ydoc");
  }
  if (ytype._item === null) {
    /**
     * If is a root type, we need to find the root key in the original ydoc
     * and use it to get the type in the other ydoc.
     */
    const rootKey = Array.from(ydoc.share.keys()).find(
      (key) => ydoc.share.get(key) === ytype,
    );
    if (rootKey == null) {
      throw new Error("type does not exist in other ydoc");
    }
    return otherYdoc.get(rootKey as string, ytype.constructor as any) as T;
  } else {
    /**
     * If it is a sub type, we use the item id to find the history type.
     */
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
 * Turn a Y.Type collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
 * @param editor BlockNote editor
 * @param fragment Y.Type
 * @returns BlockNote document (BlockNote style JSON of all blocks)
 */
export function yfragmentToBlocks<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, ISchema, SSchema>, fragment: Y.Type) {
  const pmNode = deltaToPNode(fragment.toDeltaDeep(), editor.pmSchema, null);
  if (pmNode === null) {
    return [];
  }
  return docToBlocks<BSchema, ISchema, SSchema>(pmNode);
}

/**
 * Convert blocks to a Y.Type
 *
 * This can be used when importing existing content to Y.Doc for the first time,
 * note that this should not be used to rehydrate a Y.Doc from a database once
 * collaboration has begun as all history will be lost
 *
 * @param editor BlockNote editor
 * @param blocks the blocks to convert
 * @param fragment XML fragment name
 * @returns Y.Type
 */
export function blocksToYType<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  blocks: Block<BSchema, ISchema, SSchema>[],
  fragment?: Y.Type,
) {
  if (!fragment) {
    fragment = new Y.Doc().get("prosemirror");
  }
  return pmToFragment(_blocksToProsemirrorNode(editor, blocks), fragment);
}

/**
 * Turn a Y.Doc collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
 * @param editor BlockNote editor
 * @param ydoc Y.Doc
 * @param fragment XML fragment name
 * @returns BlockNote document (BlockNote style JSON of all blocks)
 */
export function yDocToBlocks<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  ydoc: Y.Doc,
  fragment = "prosemirror",
) {
  return yfragmentToBlocks(editor, ydoc.get(fragment));
}

/**
 * This can be used when importing existing content to Y.Doc for the first time,
 * note that this should not be used to rehydrate a Y.Doc from a database once
 * collaboration has begun as all history will be lost
 *
 * @param editor BlockNote editor
 * @param blocks the blocks to convert
 * @param fragment XML fragment name
 */
export function blocksToYDoc<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  blocks: PartialBlock<BSchema, ISchema, SSchema>[],
  fragment = "prosemirror",
) {
  const delta = docToDelta(_blocksToProsemirrorNode(editor, blocks));
  const doc = new Y.Doc();
  doc.get(fragment).applyDelta(delta);
  return doc;
}

/**
 * Diff two ProseMirror documents into a delta, using BlockNote's node-pairing
 * policy ({@link blockMatchNodes}) so a block's content-type change is reported
 * as a replace rather than a schema-invalid in-place edit.
 */
export function docDiffToDelta(previousDoc: Node, newDoc: Node) {
  const initialDelta = nodeToDelta(previousDoc);
  const finalDelta = nodeToDelta(newDoc);
  return d.diff(initialDelta.done(), finalDelta.done(), {
    compare: blockMatchNodes,
  });
}

/**
 * Build a ProseMirror transaction that turns `tr.doc` into the content of a
 * Y.Type `fragment`, applying the `renderer`'s authorship as
 * `y-attributed-*` marks. Used to render a (read-only) diff of a snapshot / a
 * version comparison into the editor.
 */
export function getProseMirrorTrFromYFragment({
  tr,
  fragment,
  renderer,
}: {
  tr: Transaction;
  fragment: Y.Type;
  renderer?: Y.AbstractRenderer | null;
}): Transaction {
  const ycontent = deltaAttributionToFormat(
    fragment.toDeltaDeep({ renderer }),
    mapAttributionToMark,
  );
  // @todo it is preferred to apply the minimal diff - at least for debugging purposes. the
  // document replacal is more reliable though

  const pcontent = nodeToDelta(tr.doc, undefined, true);
  const diff = d.diff(pcontent.done(), ycontent.done(), {
    compare: blockMatchNodes,
  });
  return deltaToPSteps(tr, diff, undefined, undefined);
}
