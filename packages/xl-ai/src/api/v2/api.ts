import type { BlockNoteEditor } from "@blocknote/core";
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
  const current: LensBlock[] = editor.document;
  const base = options.base ?? current;
  const plan = planTextUpdate(editor, options.format, base, options.text);
  if (options.base === undefined) {
    return plan;
  }

  const rebased = rebaseOperations({
    base,
    current,
    operations: plan.operations,
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
