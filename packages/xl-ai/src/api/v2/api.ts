import {
  type BlockNoteEditor,
  docToBlocks,
  type PartialBlock,
} from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import { alignBlocksAndMoves } from "./alignment/alignBlocks.js";
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
import type { TextGroup } from "./merge/group.js";
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
  /**
   * Experimental, off by default. A split or a join in the text moves text
   * from one block to another (see "Splits and joins" in the README). The
   * moved text keeps its hidden styles, and the first part of a split keeps
   * the ID. With `base`, the changes of other writers to the moved text go to
   * the block that holds it. Without this option, the merges pair the
   * blocks by ID only.
   */
  experimentalTextMoves?: boolean;
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
  return computeBlocksUpdate(editor, { ...options, current: editor.document });
}

/**
 * {@link computeTextUpdate} for the document `current`, which does not have
 * to be the document of the editor. The editor supplies the schema and the
 * conversions.
 */
function computeBlocksUpdate(
  editor: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions & {
    current: readonly LensBlock[];
    /** Keep the layout blocks, also if they become empty (see `fitResult`). */
    keepLayout?: boolean;
  },
): TextUpdate {
  const { current } = options;
  const base = versionOf(options);
  const textMoves = options.experimentalTextMoves === true;
  const plan = planTextUpdate(
    editor,
    options.format,
    base ?? current,
    options.text,
    textMoves,
  );
  if (plan.error !== undefined) {
    return plan;
  }
  return updateToTarget(schemaRulesOf(editor), plan, {
    base,
    current,
    onConflict: options.onConflict,
    keepLayout: options.keepLayout,
    groups: textMoves ? (plan.groups ?? []) : undefined,
  });
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
  /**
   * Experimental, off by default (see
   * `TextUpdateOptions.experimentalTextMoves`). With `base`, the merge
   * finds the splits and joins of other writers. The JSON gives no splits
   * and joins of the client: its blocks pair by ID.
   */
  experimentalTextMoves?: boolean;
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
  return updateToTarget(
    schemaRulesOf(editor),
    { target: parsed.blocks, warnings: [] },
    {
      base,
      current,
      onConflict: options.onConflict,
      groups: options.experimentalTextMoves === true ? [] : undefined,
    },
  );
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

/**
 * Computes an update for the document of the editor, and applies it. First,
 * the blocks without an ID get an ID: the update is for the document with
 * these IDs, thus the operations refer only to IDs that the document has.
 * The steps of the IDs and of the operations go to the editor in one
 * transaction, or, for an editor that is bound to a Y.Doc, in groups (see
 * `dispatchUpdate`). On an error, the document does not change.
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
 * Returns the update that changes `current` to the target document of the
 * plan. The plan is for `base`, or for `current` if there is no `base`. A
 * plan without changes gives no operations. With `base` (an older version),
 * the target merges three-way with `current` (see `mergeTree`), and the
 * operations change `current` to the result.
 *
 * With `onConflict: "reject"`, a conflict of the merge gives the error
 * `"conflict"`, and no operations. The result then fits the schema (see
 * `fitResult`).
 */
function updateToTarget(
  rules: SchemaRules,
  plan: { target: readonly LensBlock[]; warnings: PlanWarning[] },
  documents: {
    /** The document at the version that the client read, if it is older than `current`. */
    base: readonly LensBlock[] | undefined;
    current: readonly LensBlock[];
    onConflict: "keep-current" | "reject" | undefined;
    keepLayout?: boolean;
    /** Experimental: the splits and joins of the client (see `mergeTree`). */
    groups?: readonly TextGroup[];
  },
): ValidTextUpdate | ConflictError {
  const { base, current } = documents;
  if (plan.target === (base ?? current)) {
    return { operations: [], warnings: plan.warnings };
  }
  const merged: { blocks: readonly LensBlock[]; warnings: RebaseWarning[] } =
    base === undefined
      ? { blocks: plan.target, warnings: [] }
      : mergeTree({
          base,
          ours: plan.target,
          theirs: current,
          contentKindOf: rules.contentKindOf,
          groups: documents.groups,
        });
  if (documents.onConflict === "reject" && merged.warnings.length > 0) {
    return { error: "conflict", conflicts: merged.warnings };
  }
  const result = fitResult(
    rules,
    merged.blocks,
    current,
    documents.keepLayout === true,
  );
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
 * {@link updateToTarget}). The Y.Doc write with `merge: "yjs"` uses this.
 */
export function writeText(
  editor: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions & { keepLayout?: boolean },
): TextUpdate {
  return write(editor, (current) =>
    computeBlocksUpdate(editor, { ...options, current }),
  );
}

/** Plans the target document: `document` as `text` asks for it. */
function planTextUpdate(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  document: readonly LensBlock[],
  text: string,
  /** Experimental (see `TextUpdateOptions.experimentalTextMoves`). */
  textMoves: boolean,
):
  | {
      error?: undefined;
      target: readonly LensBlock[];
      warnings: PlanWarning[];
      groups?: TextGroup[];
    }
  | { error: "invalid-document" } {
  const read = documentText(editor, format, document);
  const content = withoutByteOrderMark(text, read.text);
  // An unchanged text needs no projection.
  if (content === read.text) {
    return { target: document, warnings: [] };
  }
  const projection = read.projection();
  const parsed = parseText(editor, format, content, projection.view);
  if (parsed.error !== undefined) {
    return parsed;
  }
  const { pairs, moves } = alignBlocksAndMoves(
    projection.view,
    parsed.blocks,
    textMoves,
  );
  return planTarget({
    document,
    projection,
    incoming: parsed.blocks,
    alignment: pairs,
    moves,
    contentKindOf: schemaRulesOf(editor).contentKindOf,
    shadowOf: shadowsOf(editor, format),
    newId: () => UniqueID.options.generateID(),
  });
}
