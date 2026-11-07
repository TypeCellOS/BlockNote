import {
  type BlockNoteEditor,
  docToBlocks,
  type PartialBlock,
} from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import { alignBlocks } from "./alignment/alignBlocks.js";
import { type SchemaRules, schemaRulesOf } from "./blocks/schema.js";
import type { LensBlock } from "./blocks/types.js";
import type { TextFormat } from "./formats/types.js";
import { fixBlockIds, withDistinctIds } from "./operations/blockIds.js";
import { applyOperations } from "./operations/applyOperations.js";
import { dispatchUpdate } from "./operations/dispatch.js";
import { diffDocuments } from "./operations/diffDocuments.js";
import type { BlockOperation } from "./operations/types.js";
import { parseJSON } from "./parse/parseJSON.js";
import { parseText, withoutByteOrderMark } from "./parse/parseText.js";
import { documentText } from "./projection/cache.js";
import { shadowsOf } from "./projection/shadows.js";
import { mergeTree, type RebaseWarning } from "./merge/tree.js";
import { fitResult } from "./fit/fitResult.js";
import { type FitWarning, mergedCellsRemoved } from "./fit/fitTable.js";
import { type PlanWarning, planTarget } from "./plan/planTarget.js";

/** Returns the document in the format. A client reads this text, changes it, and writes it back. */
export function getDocumentText(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
): string {
  return documentText(editor, format, editor.document).text;
}

export type TextUpdateWarning = PlanWarning | RebaseWarning | FitWarning;

/** A write that applies: its operations and its warnings. */
export type ValidTextUpdate = {
  error?: undefined;
  operations: BlockOperation[];
  warnings: TextUpdateWarning[];
};

/** A write with `onConflict: "reject"` that has conflicts: nothing applies. */
export type ConflictError = { error: "conflict"; conflicts: RebaseWarning[] };

/**
 * The result of a write: the operations and the warnings, or an error. Then
 * the document does not change.
 *
 * - `"invalid-document"`: the text or the JSON gives blocks that do not fit
 *   the schema of the editor (for example an unknown block type, or a table
 *   cell that spans more rows than the table has).
 * - `"conflict"`: see {@link WriteFromVersion}.
 */
export type TextUpdate =
  | ValidTextUpdate
  | { error: "invalid-document" }
  | ConflictError;

/**
 * The version that the client read (`base`), and what a conflict with a
 * change of another writer does (`onConflict`). Each write must give
 * `base`: a write that forgets it would remove the changes of other writers
 * without a warning.
 */
export type WriteFromVersion<Base> =
  | {
      /**
       * The client read the current document (for example in the same
       * tick). The write applies to the current document, without a merge.
       * The text is the truth: if other writers changed the document after
       * the read of the client, the write reverts their changes where the
       * format shows them.
       */
      base: "current";
      onConflict?: undefined;
    }
  | {
      /**
       * The version that the client read. Get it from your version history.
       * The result keeps the changes that other writers made after that
       * version (see `merge/tree.ts`).
       */
      base: Base;
      /**
       * What a conflict (a {@link RebaseWarning}) does:
       *
       * - `"keep-current"` (the default): the change of the other writer
       *   stays there, and the result has the warning. The other changes of
       *   the client apply.
       * - `"reject"`: nothing applies, and the result is the error
       *   `"conflict"`, with the conflicts.
       */
      onConflict?: "keep-current" | "reject";
    };

export type TextUpdateOptions = {
  format: TextFormat;
  /** A text from {@link getDocumentText}, possibly with changes. */
  text: string;
} & WriteFromVersion<readonly LensBlock[]>;

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
 *
 * The operations refer to the blocks of `editor.document` by ID. In an
 * editor without a view, a block can have no ID (for example after
 * `removeBlocks` removed all blocks). {@link updateDocumentFromText} gives
 * these blocks an ID first.
 */
export function computeTextUpdate(
  editor: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions,
): TextUpdate {
  return textUpdate(editor, options, editor.document);
}

/**
 * Computes the operations with {@link computeTextUpdate}, and applies them to
 * the editor (see {@link write}). First, the blocks without an ID get an ID.
 */
export function updateDocumentFromText(
  editor: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions,
): TextUpdate {
  return writeText(editor, options);
}

/**
 * {@link updateDocumentFromText}, with the option `keepLayout` (see
 * `fitResult`). The Y.Doc write with `merge: "yjs"` uses this.
 */
export function writeText(
  editor: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions & { keepLayout?: boolean },
): TextUpdate {
  return write(editor, (current) => textUpdate(editor, options, current));
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
} & WriteFromVersion<readonly LensBlock[]>;

/**
 * Computes the operations that change the document of the editor to the
 * document of the client, as BlockNote JSON. The JSON contains the block IDs,
 * thus the blocks pair by ID, not by their text. The operations change only
 * the blocks and fields that the client changed. With `base`, they keep the
 * changes of other writers (see `merge/tree.ts`).
 */
export function computeJSONUpdate(
  editor: BlockNoteEditor<any, any, any>,
  options: JSONUpdateOptions,
): TextUpdate {
  return jsonUpdate(editor, options, editor.document);
}

/** Computes the operations with {@link computeJSONUpdate}, and applies them to the editor (see {@link write}). */
export function updateDocumentFromJSON(
  editor: BlockNoteEditor<any, any, any>,
  options: JSONUpdateOptions,
): TextUpdate {
  return write(editor, (current) => jsonUpdate(editor, options, current));
}

// The pipeline (see "Pipeline" in the README). A write runs these functions:
//
//   text:  textUpdate = planText (1 Project, 2 Parse and align, 3 Plan)
//                       then updateFromPlan (4 Merge, 5 Fit, 6 Diff)
//   JSON:  jsonUpdate = parseJSON (2 Parse)
//                       then updateFromPlan (4 Merge, 5 Fit, 6 Diff)
//   write: write (7 Apply, 8 Dispatch) around textUpdate or jsonUpdate
//
// `current` is the document that the operations change. It does not have to
// be the document of the editor: the editor supplies the schema and the
// conversions.

function textUpdate(
  editor: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions & { keepLayout?: boolean },
  current: readonly LensBlock[],
): TextUpdate {
  const base = versionOf(options);
  const plan = planText(editor, options.format, base ?? current, options.text);
  if (plan.error !== undefined) {
    return plan;
  }
  return updateFromPlan(schemaRulesOf(editor), plan, {
    base,
    current,
    onConflict: options.onConflict,
    keepLayout: options.keepLayout,
  });
}

function jsonUpdate(
  editor: BlockNoteEditor<any, any, any>,
  options: JSONUpdateOptions,
  current: readonly LensBlock[],
): TextUpdate {
  const base = versionOf(options);
  const parsed = parseJSON(editor, options.document, base ?? current, current);
  if (parsed.error !== undefined) {
    return parsed;
  }
  return updateFromPlan(
    schemaRulesOf(editor),
    { target: parsed.blocks, warnings: [] },
    { base, current, onConflict: options.onConflict },
  );
}

/**
 * Stages 1 to 3: the target document, `document` as `text` asks for it.
 * `document` is the version of `base`, or the current document.
 */
function planText(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  document: readonly LensBlock[],
  text: string,
):
  | { error?: undefined; target: readonly LensBlock[]; warnings: PlanWarning[] }
  | { error: "invalid-document" } {
  // 1. Project. The text of the document and its projection come from the
  // cache, if the document is the last document of the editor and format.
  const read = documentText(editor, format, document);
  const content = withoutByteOrderMark(text, read.text);
  // An unchanged text needs no projection, and gives no operations (GetPut).
  if (content === read.text) {
    return { target: document, warnings: [] };
  }
  const projection = read.projection();
  // 2. Parse and align.
  const parsed = parseText(editor, format, content, projection.view);
  if (parsed.error !== undefined) {
    return parsed;
  }
  const pairs = alignBlocks(projection.view, parsed.blocks);
  // 3. Plan.
  return planTarget({
    document,
    projection,
    incoming: parsed.blocks,
    alignment: pairs,
    contentKindOf: schemaRulesOf(editor).contentKindOf,
    shadowOf: shadowsOf(editor, format),
    newId: () => UniqueID.options.generateID(),
  });
}

/**
 * Stages 4 to 6: the operations that change `current` to the result of the
 * plan. A plan without changes gives no operations.
 *
 * With `onConflict: "reject"`, a conflict of the merge gives the error
 * `"conflict"`, and no operations.
 */
function updateFromPlan(
  rules: SchemaRules,
  plan: { target: readonly LensBlock[]; warnings: PlanWarning[] },
  documents: {
    /** The version that the client read, or `undefined` for `base: "current"`. */
    base: readonly LensBlock[] | undefined;
    current: readonly LensBlock[];
    onConflict: "keep-current" | "reject" | undefined;
    keepLayout?: boolean;
  },
): ValidTextUpdate | ConflictError {
  const { base, current } = documents;
  if (plan.target === (base ?? current)) {
    return { operations: [], warnings: plan.warnings };
  }
  // 4. Merge: only for a version as `base`. The target is for that version,
  // and merges three-way with the current document (see `mergeTree`).
  const merged: { blocks: readonly LensBlock[]; warnings: RebaseWarning[] } =
    base === undefined
      ? { blocks: plan.target, warnings: [] }
      : mergeTree({
          base,
          ours: plan.target,
          theirs: current,
          contentKindOf: rules.contentKindOf,
        });
  if (documents.onConflict === "reject" && merged.warnings.length > 0) {
    return { error: "conflict", conflicts: merged.warnings };
  }
  // 5. Fit.
  const result = fitResult(
    rules,
    merged.blocks,
    current,
    documents.keepLayout === true,
  );
  // 6. Diff.
  return {
    operations: diffDocuments(current, result),
    warnings: [
      ...plan.warnings,
      ...merged.warnings,
      ...mergedCellsRemoved(current, result),
    ],
  };
}

/**
 * Stages 7 and 8: computes an update for the document of the editor, and
 * applies it. First, the blocks without an ID get an ID: the update is for
 * the document with these IDs, thus the operations refer only to IDs that
 * the document has. The steps of the IDs and of the operations go to the
 * editor in one transaction, or, for an editor that is bound to a Y.Doc, in
 * groups (see `dispatchUpdate`). On an error, the document does not change.
 */
function write(
  editor: BlockNoteEditor<any, any, any>,
  compute: (current: readonly LensBlock[]) => TextUpdate,
): TextUpdate {
  const tr = editor.prosemirrorState.tr;
  fixBlockIds(tr);
  const update = compute(docToBlocks(tr.doc));
  if (update.error === undefined) {
    applyOperations(tr, update.operations);
    dispatchUpdate(editor, tr);
  }
  return update;
}

/**
 * The version that the write merges from, or `undefined` for a write on the
 * current document (`base: "current"`).
 */
function versionOf(
  options: WriteFromVersion<readonly LensBlock[]>,
): readonly LensBlock[] | undefined {
  return options.base === "current" ? undefined : withDistinctIds(options.base);
}
