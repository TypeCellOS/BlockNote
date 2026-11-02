import {
  type BlockNoteEditor,
  blockToNode,
  docToBlocks,
  type PartialBlock,
} from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import { alignBlocks } from "./alignment/alignBlocks.js";
import { flattenBlocks } from "./blocks/flatten.js";
import { BlockTree } from "./blocks/tree.js";
import type { ContentKind, LensBlock } from "./blocks/types.js";
import type { TextFormat } from "./formats/types.js";
import { applyBlockOperations } from "./operations/applyOperations.js";
import { diffDocuments } from "./operations/diffDocuments.js";
import type { BlockOperation } from "./operations/types.js";
import { projectDocument } from "./projection/projectDocument.js";
import {
  type RebaseWarning,
  rebaseOperations,
} from "./rebase/rebaseOperations.js";
import { fitLayout, type LayoutRule } from "./target/fitLayout.js";
import { type PlanWarning, planTarget } from "./target/planTarget.js";

/** Returns the document in the format. A client reads this text, changes it, and writes it back. */
export function getDocumentText(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
): string {
  return format.serialize(editor, editor.document);
}

export type TextUpdateWarning = PlanWarning | RebaseWarning;

export type TextUpdate = {
  operations: BlockOperation[];
  warnings: TextUpdateWarning[];
};

export type TextUpdateOptions = {
  format: TextFormat;
  /** A text from {@link getDocumentText}, possibly with changes. */
  text: string;
  /**
   * The document at the version that the client read, if it is older than
   * the document of the editor. Get it from your version history. The result
   * then keeps the changes that other writers made after that version (see
   * `rebase/`). Without `base`, the text applies to the current document.
   */
  base?: readonly LensBlock[];
};

/**
 * Computes the operations that change the document of the editor to agree with
 * the text.
 *
 * The operations keep the data that the format does not show. Examples are
 * block IDs, some props and styles, and blocks that the format does not render.
 *
 * If the text did not change, there are no operations. This is also true if
 * only the markup changed and the format gives the same blocks, for example
 * `*` and `-` bullets in markdown.
 */
export function computeTextUpdate(
  editor: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions,
): TextUpdate {
  return computeBlocksUpdate(editor, { ...options, current: editor.document });
}

/**
 * {@link computeTextUpdate} for the document `current`, which does not have
 * to be the document of the editor. The editor supplies the schema and the
 * conversions. The Y.Doc API uses this.
 */
export function computeBlocksUpdate(
  editor: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions & { current: readonly LensBlock[] },
): TextUpdate {
  const { current } = options;
  const base = options.base ?? current;
  return updateToTarget(
    editor,
    planTextUpdate(editor, options.format, base, options.text),
    { base, current, rebase: options.base !== undefined },
  );
}

export type JSONUpdateOptions = {
  /**
   * The full document as the client wants it, as BlockNote JSON (for example
   * `editor.document` from a read, with changes). A block with the ID of a
   * block in the document is that block. A block without an ID is a new
   * block. A missing field gets its default value.
   *
   * A block ID can identify only one block. Thus, a block gets a new ID if an
   * earlier block of the JSON has its ID, or (with `base`) if its ID is not
   * in `base` but is in the current document, as the ID of a block of
   * another writer.
   */
  document: readonly PartialBlock<any, any, any>[];
  /** The document at the version that the client read (see {@link TextUpdateOptions}). */
  base?: readonly LensBlock[];
};

/**
 * Computes the operations that change the document of the editor to the
 * document of the client, as BlockNote JSON. The JSON contains the block IDs,
 * thus the blocks pair by ID, not by their text. The operations change only
 * the blocks and fields that the client changed. With `base`, they keep the
 * changes of other writers (see `rebase/`).
 */
/**
 * The result of a JSON update: the update, or an error if the JSON is not a
 * valid document for the schema of the editor (for example an unknown block
 * type, or content of the wrong kind).
 */
export type JSONUpdate =
  | (TextUpdate & { error?: undefined })
  | { error: "invalid-document" };

export function computeJSONUpdate(
  editor: BlockNoteEditor<any, any, any>,
  options: JSONUpdateOptions,
): JSONUpdate {
  const current: LensBlock[] = editor.document;
  const base = options.base ?? current;
  const target = toBlocks(
    editor,
    withUniqueIds(options.document, base, current),
  );
  if (target === undefined) {
    return { error: "invalid-document" };
  }
  return updateToTarget(
    editor,
    { target, warnings: [] },
    { base, current, rebase: options.base !== undefined },
  );
}

/** Computes the operations with {@link computeJSONUpdate}, and applies them to the editor in one transaction. */
export function updateDocumentFromJSON(
  editor: BlockNoteEditor<any, any, any>,
  options: JSONUpdateOptions,
): JSONUpdate {
  const update = computeJSONUpdate(editor, options);
  if (update.error === undefined) {
    applyBlockOperations(editor, update.operations);
  }
  return update;
}

/**
 * Full blocks with IDs, from partial blocks: through ProseMirror nodes, as
 * the editor stores them. Returns `undefined` if the blocks are not valid for
 * the schema.
 */
function toBlocks(
  editor: BlockNoteEditor<any, any, any>,
  blocks: readonly PartialBlock<any, any, any>[],
): LensBlock[] | undefined {
  const schema = editor.pmSchema;
  let nodes;
  try {
    nodes = blocks.map((block) => blockToNode(block, schema));
  } catch {
    // `blockToNode` throws for blocks that do not fit the schema. For JSON
    // from a client, this is an expected failure.
    return undefined;
  }
  return docToBlocks(
    schema.nodes["doc"].create(
      null,
      schema.nodes["blockGroup"].create(null, nodes),
    ),
  );
}

/**
 * Returns the blocks without IDs where an ID cannot identify the block: a
 * later block with the ID of an earlier block, or a block with an ID that is
 * not in `base` but is in `current` (a block of another writer). These
 * blocks are new blocks, and get new IDs.
 */
function withUniqueIds(
  blocks: readonly PartialBlock<any, any, any>[],
  base: readonly LensBlock[],
  current: readonly LensBlock[],
): PartialBlock<any, any, any>[] {
  const inBase = new Set(new BlockTree(base).ids);
  const inCurrent = new Set(new BlockTree(current).ids);
  const used = new Set<string>();
  function fix(
    block: PartialBlock<any, any, any>,
  ): PartialBlock<any, any, any> {
    const { id, children, ...fields } = block;
    const keep =
      typeof id === "string" &&
      !used.has(id) &&
      (inBase.has(id) || !inCurrent.has(id));
    if (keep) {
      used.add(id);
    }
    return {
      ...fields,
      ...(keep ? { id } : {}),
      ...(children === undefined ? {} : { children: children.map(fix) }),
    };
  }
  return blocks.map(fix);
}

/**
 * Returns the update that changes `current` to the target document of the
 * plan. First, the layout blocks of the target change to fit the schema (see
 * `fitLayout`). The diff gives the operations for `base`. If `base` is older
 * than `current` (`rebase`), the rebase moves them to `current` (see
 * `rebase/`).
 */
function updateToTarget(
  editor: BlockNoteEditor<any, any, any>,
  plan: { target: readonly LensBlock[]; warnings: PlanWarning[] },
  documents: {
    base: readonly LensBlock[];
    current: readonly LensBlock[];
    rebase: boolean;
  },
): TextUpdate {
  const { base, current } = documents;
  const target =
    plan.target === base
      ? base
      : fitLayout(plan.target, (type) => layoutRuleOf(editor, type));
  const operations = target === base ? [] : diffDocuments(base, target);
  if (!documents.rebase) {
    return { operations, warnings: plan.warnings };
  }
  const rebased = rebaseOperations({
    base,
    current,
    target,
    operations,
    contentKindOf: (type) => contentKindOf(editor, type),
  });
  return {
    operations: rebased.operations,
    warnings: [...plan.warnings, ...rebased.warnings],
  };
}

/** Computes the operations with {@link computeTextUpdate}, and applies them to the editor in one transaction. */
export function updateDocumentFromText(
  editor: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions,
): TextUpdate {
  const update = computeTextUpdate(editor, options);
  applyBlockOperations(editor, update.operations);
  return update;
}

/** Plans the target document: `document` as `text` asks for it. */
function planTextUpdate(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  document: readonly LensBlock[],
  text: string,
): { target: readonly LensBlock[]; warnings: PlanWarning[] } {
  const projection = projectDocument(editor, format, document);
  if (text === projection.text) {
    return { target: document, warnings: [] };
  }

  const incoming = flattenBlocks(format.parse(editor, text));
  const { target, warnings } = planTarget({
    document,
    projection,
    incoming,
    alignment: alignBlocks(projection.view, incoming),
    contentKindOf: (type) => contentKindOf(editor, type),
    newId: () => UniqueID.options.generateID(),
  });
  return { target, warnings };
}

/** The child rule of a layout block type, or `undefined` for other types. */
function layoutRuleOf(
  editor: BlockNoteEditor<any, any, any>,
  type: string,
): LayoutRule | undefined {
  const config = editor.schema.blockSchema[type];
  if (config?.layoutOnly !== true) {
    return undefined;
  }
  const children = config.children;
  return {
    minChildren:
      children !== undefined && "min" in children ? (children.min ?? 1) : 1,
    namedOnly: config.placeable === "namedOnly",
    dissolves: !(
      children !== undefined &&
      "dissolve" in children &&
      children.dissolve === false
    ),
  };
}

function contentKindOf(
  editor: BlockNoteEditor<any, any, any>,
  type: string,
): ContentKind {
  const config = editor.schema.blockSchema[type];
  if (config === undefined) {
    throw new Error(`Block type "${type}" is not in the editor's schema`);
  }
  return config.content;
}
