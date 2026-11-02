import {
  type BlockNoteEditor,
  blockToNode,
  docToBlocks,
  type PartialBlock,
} from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import { alignBlocks } from "./alignment/alignBlocks.js";
import { flattenBlocks } from "./blocks/flatten.js";
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
 * only the formatting changed and the format makes it the same, for example
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
  return rebaseIfOlder(
    editor,
    planTextUpdate(editor, options.format, base, options.text),
    options.base,
    current,
  );
}

export type JSONUpdateOptions = {
  /**
   * The full document as the client wants it, as BlockNote JSON (for example
   * `editor.document` from a read, with changes). A block with the ID of a
   * block in the document is that block. A block without an ID is a new
   * block. A missing field gets its default value.
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
export function computeJSONUpdate(
  editor: BlockNoteEditor<any, any, any>,
  options: JSONUpdateOptions,
): TextUpdate {
  const current: LensBlock[] = editor.document;
  const base = options.base ?? current;
  const operations = diffDocuments(base, toBlocks(editor, options.document));
  return rebaseIfOlder(
    editor,
    { operations, warnings: [] },
    options.base,
    current,
  );
}

/** Computes the operations with {@link computeJSONUpdate}, and applies them to the editor in one transaction. */
export function updateDocumentFromJSON(
  editor: BlockNoteEditor<any, any, any>,
  options: JSONUpdateOptions,
): TextUpdate {
  const update = computeJSONUpdate(editor, options);
  applyBlockOperations(editor, update.operations);
  return update;
}

/** Full blocks with IDs, from partial blocks: through ProseMirror nodes, as the editor stores them. */
function toBlocks(
  editor: BlockNoteEditor<any, any, any>,
  blocks: readonly PartialBlock<any, any, any>[],
): LensBlock[] {
  const schema = editor.pmSchema;
  const nodes = blocks.map((block) => blockToNode(block, schema));
  return docToBlocks(
    schema.nodes["doc"].create(
      null,
      schema.nodes["blockGroup"].create(null, nodes),
    ),
  );
}

/**
 * Returns the update for the current document. The operations of `update`
 * are for `base`. If `base` is the current document (no `base`), they are
 * already for it. If not, the rebase moves them (see `rebase/`).
 */
function rebaseIfOlder(
  editor: BlockNoteEditor<any, any, any>,
  update: TextUpdate,
  base: readonly LensBlock[] | undefined,
  current: readonly LensBlock[],
): TextUpdate {
  if (base === undefined) {
    return update;
  }
  const rebased = rebaseOperations({
    base,
    current,
    operations: update.operations,
    contentKindOf: (type) => contentKindOf(editor, type),
  });
  return {
    operations: rebased.operations,
    warnings: [...update.warnings, ...rebased.warnings],
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

/** Plans the operations that change `document` to agree with `text`. */
function planTextUpdate(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  document: readonly LensBlock[],
  text: string,
): TextUpdate {
  const projection = projectDocument(editor, format, document);
  if (text === projection.text) {
    return { operations: [], warnings: [] };
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
  return { operations: diffDocuments(document, target), warnings };
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
