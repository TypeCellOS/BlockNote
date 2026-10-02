import {
  defaultTransformer,
  deltaToPNode,
  deltaToPSteps,
  docToDelta,
  nodeToDelta,
  pmnodeToDelta,
  ynodeToPmnode,
} from "@y/prosemirror";
import * as d from "lib0/delta";
import { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
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
 * Find the equivalent of a Y.Node in another Y.Doc.
 *
 * For root types this looks up the matching shared key; for sub-types it
 * locates the item by its client/clock ID in the target doc's store.
 */
export function findTypeInOtherYdoc<T extends Y.Node<any>>(
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
    if (typeof rootKey !== "string") {
      throw new Error("type does not exist in other ydoc");
    }
    return otherYdoc.get(rootKey, ytype.name) as T;
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
 * Collect all stored Yjs ID ranges belonging to a fragment, including deleted
 * descendants. Items belonging to other shared types are excluded.
 *
 * Resolves the fragment in the supplied document and scans its stored items:
 * walking visible content would miss deleted subtrees. To include all deleted
 * descendants, the document or update must retain them; content already
 * garbage-collected cannot be recovered here.
 *
 * Updates are loaded into a temporary document with `gc: false`, which is
 * destroyed after collection. Caller-provided documents are never destroyed.
 */
export function collectFragmentIds(
  fragment: Y.Node,
  docOrUpdate: Uint8Array | Y.Doc,
): Y.IdSet {
  if (docOrUpdate instanceof Uint8Array) {
    const doc = new Y.Doc({ gc: false });
    try {
      Y.applyUpdate(doc, docOrUpdate);
      return collectFragmentIds(fragment, doc);
    } finally {
      doc.destroy();
    }
  }

  const targetFragment = findTypeInOtherYdoc(fragment, docOrUpdate);
  const contentIds = Y.createIdSet();
  for (const structs of docOrUpdate.store.clients.values()) {
    for (const item of structs) {
      if (item instanceof Y.Item && Y.isParentOf(targetFragment, item)) {
        contentIds.add(item.id.client, item.id.clock, item.length);
      }
    }
  }
  return contentIds;
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
 * Whether a `toDeltaDeep()` tree contains a `blockContainer` node.
 *
 * The delta is an untyped tree from an external library whose child
 * collections may be plain arrays or lib0 `List`s, so this walks it
 * structurally (via the iteration protocol) instead of relying on its types.
 */
function deltaHasBlockContainer(node: unknown): boolean {
  if (typeof node !== "object" || node === null) {
    return false;
  }
  const record = node as Record<string, unknown>;
  if (record["name"] === "blockContainer") {
    return true;
  }
  return (
    deltaChildrenContainBlock(record["children"]) ||
    deltaChildrenContainBlock(record["insert"])
  );
}

function deltaChildrenContainBlock(value: unknown): boolean {
  // Arrays and lib0 `List`s both satisfy the iteration protocol, and
  // everything else (strings are excluded by the typeof check, plain
  // attribute values, null) is skipped.
  if (
    typeof value !== "object" ||
    value === null ||
    !(Symbol.iterator in value)
  ) {
    return false;
  }
  for (const child of value as Iterable<unknown>) {
    if (deltaHasBlockContainer(child)) {
      return true;
    }
  }
  return false;
}

/**
 * Turn a Y.Node collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
 * @param editor BlockNote editor
 * @param fragment Y.Node
 * @returns BlockNote document (BlockNote style JSON of all blocks)
 */
export function yfragmentToBlocks<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, ISchema, SSchema>, fragment: Y.Node) {
  // Docs seeded by the current `blocksToYDoc([])` are pristine-empty: no Y
  // children at all. This covers the common case without allocating a delta;
  // the structural check below only remains for pre-existing fragments (see
  // below).
  if (fragment.length === 0) {
    return [];
  }
  const delta = fragment.toDeltaDeep();
  // A fragment without block containers holds no blocks — e.g. one written
  // by an older `blocksToYDoc([])` (which used to write a childless block
  // group). Returning early avoids materializing the schema filler paragraph
  // in `deltaToPNode` below, whose id would be freshly minted on every
  // read — making empty docs unstable.
  if (!deltaHasBlockContainer(delta)) {
    return [];
  }
  const pmNode = deltaToPNode(delta, editor.pmSchema, null);
  return docToBlocks<BSchema, ISchema, SSchema>(pmNode);
}

/**
 * Convert blocks to a Y.Node
 *
 * This can be used when importing existing content to Y.Doc for the first time,
 * note that this should not be used to rehydrate a Y.Doc from a database once
 * collaboration has begun as all history will be lost
 *
 * @param editor BlockNote editor
 * @param blocks the blocks to convert
 * @param fragment XML fragment name
 * @returns Y.Node
 */
export function blocksToYType<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  blocks: Block<BSchema, ISchema, SSchema>[],
  fragment?: Y.Node,
) {
  if (!fragment) {
    fragment = new Y.Doc().get("prosemirror");
  }
  // An empty block array writes nothing: the fragment stays pristine-empty
  // (no childless block group). This matters for the sync layer — the
  // @y/prosemirror initial-content gate only engages when the ytype has no
  // children (`ytype.length === 0`), keeping each mount's schema-default
  // skeleton local instead of committing a competing paragraph item per
  // client (the init race). See `EmptyDocBinding.test.ts`.
  if (blocks.length === 0) {
    return fragment;
  }
  fragment.applyDelta(pmnodeToDelta(_blocksToProsemirrorNode(editor, blocks)));
  return fragment;
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
  const doc = new Y.Doc();
  // An empty block array seeds a pristine-empty fragment (see
  // `blocksToYType` above for why writing nothing matters).
  if (blocks.length === 0) {
    doc.get(fragment);
    return doc;
  }
  const delta = docToDelta(_blocksToProsemirrorNode(editor, blocks));
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
 * Append steps that render a Y node into the transaction's current document.
 * Supports both plain and already-attributed documents, replacing old preview
 * marks with the renderer's attributions using BlockNote's node-pairing policy.
 * Defaults to BlockNote's attribution transformer. Does not dispatch or write
 * to the Y node; the caller controls sync configuration and dispatch.
 */
export function yNodeToTransaction(
  tr: Transaction,
  node: Y.Node,
  options: NonNullable<Parameters<typeof ynodeToPmnode>[2]> = {},
): Transaction {
  const renderedDoc = ynodeToPmnode(node, tr.doc.type.schema, {
    transformer: defaultTransformer({ mapAttributionToMark }),
    ...options,
  });
  const renderedDelta = docDiffToDelta(tr.doc, renderedDoc);
  return deltaToPSteps(tr, renderedDelta).setMeta("y-sync-hydration", {
    delta: renderedDelta,
  });
}
