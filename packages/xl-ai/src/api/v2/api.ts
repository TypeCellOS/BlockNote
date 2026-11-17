import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import { alignBlocks, type BlockPair } from "./alignment/index.js";
import type { FlatBlock, LensBlock } from "./model.js";
import {
  assertBlockIds,
  BlockIndex,
  flattenBlocks,
  type SchemaRules,
  schemaRulesOf,
} from "./util/blocks/index.js";
import type { TextFormat } from "./formats/index.js";
import {
  applyOperations,
  type BlockOperation,
  diffDocuments,
  dispatchUpdate,
  newIdsForLayoutChanges,
} from "./operations/index.js";
import {
  parseJSON,
  parseText,
  replaceDisallowedIds,
  withoutByteOrderMark,
} from "./parse/index.js";
import {
  assertBlocksRoundTrip,
  type Projection,
  projectDocument,
  shadowOf,
  type ViewBlock,
} from "./projection/index.js";
import { mergeDocument, type MergeWarning } from "./merge/index.js";
import { fitResult, type FitWarning, mergedCellsRemoved } from "./fit/index.js";
import {
  targetFromPairs,
  type TargetInput,
  type TargetWarning,
} from "./target/index.js";

/** Returns the document in the format. A client reads this text, changes it, and writes it back. */
export function getDocumentText(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
): string {
  return format.serialize(editor, editor.document);
}

export type ChangeWarning = TargetWarning | MergeWarning | FitWarning;

/** A change that applies: its operations and its warnings. */
export type ChangeOperations = {
  error?: undefined;
  operations: BlockOperation[];
  /** No `MergeWarning`: a strict write does not merge. */
  warnings: (TargetWarning | FitWarning)[];
};

/**
 * A block that other writers changed after `base`. A new or a removed block
 * with blocks in it is one item.
 */
export type ChangeOfOthers = {
  id: string;
  change: "added" | "changed" | "moved" | "removed";
};

/**
 * The text or the JSON gives blocks that do not fit the schema of the editor
 * (for example an unknown block type, or a table cell that spans more rows
 * than the table has): nothing applies.
 */
export type InvalidDocumentError = { error: "invalid-document" };

/** The document changed after `base`: nothing applies. */
export type DocumentChangedError = {
  error: "document-changed";
  /** The blocks that other writers changed after `base`. */
  changesOfOthers: ChangeOfOthers[];
};

/** A change with `onConflict: "reject"` that has conflicts: nothing applies. */
export type ConflictError = { error: "conflict"; conflicts: MergeWarning[] };

/**
 * The result of a change: the operations and the warnings, or an error. On
 * an error, the document does not change.
 *
 * - `"invalid-document"`: see {@link InvalidDocumentError}.
 * - `"document-changed"`: see {@link WriteFromVersion}.
 */
export type ChangeResult =
  | ChangeOperations
  | InvalidDocumentError
  | DocumentChangedError;

/**
 * The version that the client read (`base`). Each write must give `base`: a
 * write that forgets it would remove the changes of other writers without a
 * warning.
 */
export type WriteFromVersion<Base> = {
  /**
   * The version that the client read.
   *
   * - `"current"`: the client read the current document (for example in the
   *   same tick). There is no check: the text is the truth. If other writers
   *   changed the document after the read of the client, the write reverts
   *   their changes where the format shows them.
   * - A version: if the document changed after it, nothing applies, and the
   *   result is the error `"document-changed"`. Get the version from your
   *   version history.
   */
  base: "current" | Base;
};

/**
 * A text in a format (for example markdown), as the client wants the
 * document. The blocks of the text pair with the blocks of the document by
 * the location of their text (see "Identity" in the README).
 */
export type TextChange = {
  format: TextFormat;
  /** A text from {@link getDocumentText}, possibly with changes. */
  text: string;
  document?: undefined;
};

/**
 * The full document as BlockNote JSON, as the client wants it. The blocks
 * pair with the blocks of the document by ID.
 */
export type JSONChange = {
  /**
   * The full document as the client wants it (for example `editor.document`
   * from a read, with changes). A block with the ID of a block in the
   * document is that block. A block without an ID is a new block. A missing
   * field gets its default value.
   *
   * A block ID can identify only one block. Thus, a JSON with two blocks with
   * one ID gives the error `"invalid-document"`. In a merge write, a block
   * gets a new ID if its ID is not in `base` but is in the current document,
   * as the ID of a block of another writer.
   */
  document: readonly PartialBlock<any, any, any>[];
  format?: undefined;
  text?: undefined;
};

/** A change of a client: a text or BlockNote JSON, and the version that the client read. */
export type DocumentChange = (TextChange | JSONChange) &
  WriteFromVersion<readonly LensBlock[]>;

/**
 * Computes the operations that change the document of the editor to agree
 * with the change. Nothing changes: {@link applyOperations} applies the
 * operations to a transaction of the caller (for example as suggestions).
 * {@link updateDocument} computes and applies them in one step.
 *
 * The write is strict. With a version as `base`, it applies only if the
 * document is still at that version. If other writers changed the document
 * after `base`, the result is the error `"document-changed"`, with the
 * blocks that they changed. The check compares all data of the two
 * documents, also the data that the format does not show: the target of the
 * change comes from the current document, thus a change that the client did
 * not see must stop the write. To merge the change with the changes of
 * other writers, use {@link computeOperationsWithMerge}.
 *
 * The operations change only the blocks and fields that the client changed.
 * They keep the data that the change does not show: for a text, examples are
 * block IDs, some props and styles, and blocks that the format does not
 * render.
 *
 * If the text did not change, there are no operations. This is also true if
 * only the markup changed and the format gives the same blocks, for example
 * `*` and `-` bullets in markdown.
 *
 * The operations refer to the blocks of `editor.document` by ID. Throws if
 * a block of the document or of `base` has no ID, or if two blocks have one
 * ID (see `assertBlockIds`, also for a Y.Doc that has such blocks).
 */
export function computeOperations(
  editor: BlockNoteEditor<any, any, any>,
  change: DocumentChange,
): ChangeResult {
  requireBase(change.base);
  const current = editor.document;
  if (change.base !== "current") {
    const changesOfOthers = changesAfterBase(change.base, current);
    if (changesOfOthers.length > 0) {
      return { error: "document-changed", changesOfOthers };
    }
  }
  return operationsOf(editor, change, current);
}

/**
 * Computes the operations of the change (see {@link computeOperations}), and
 * applies them to the editor (see {@link dispatchOperations}).
 */
export function updateDocument(
  editor: BlockNoteEditor<any, any, any>,
  change: DocumentChange,
): ChangeResult {
  const update = computeOperations(editor, change);
  if (update.error === undefined) {
    dispatchOperations(editor, update.operations);
  }
  return update;
}

/**
 * The version that the client read (`base`), and what a conflict with a
 * change of another writer does (`onConflict`), for a merge write.
 */
export type MergeFromVersion<Base> = {
  /**
   * The version that the client read. Get it from your version history.
   * `"current"` is not allowed: there is nothing to merge.
   */
  base: Base;
  /**
   * What a conflict (a {@link MergeWarning}) does. Required: each call
   * states it.
   *
   * - `"reject"`: nothing applies, and the result is the error `"conflict"`,
   *   with the conflicts. This is the recommended value.
   * - `"keep-current"`: the change of the other writer stays there, and the
   *   result has the warning. The other changes of the client apply.
   */
  onConflict: "reject" | "keep-current";
};

/** A change of a merge write that applies: its operations and its warnings. */
export type MergedChangeOperations = {
  error?: undefined;
  operations: BlockOperation[];
  warnings: ChangeWarning[];
  /**
   * The blocks that other writers changed after `base`. The document after
   * the write has these changes too. A client (for example an AI agent)
   * that reads the document again sees these changes, which it did not
   * write.
   */
  changesOfOthers: ChangeOfOthers[];
  /**
   * The document as the client wrote it: the version of `base` with the
   * change of the client, and without the changes of other writers. Its text
   * is the text that the client has now. Thus, it is the `base` of the next
   * write of this client, if the client does not read the document again:
   * keep it as a version.
   *
   * The document after the write is not that base: it has changes that the
   * client did not see, and a write of the text of the client from it
   * removes them without a warning.
   */
  written: LensBlock[];
};

/**
 * The result of a merge write: the operations and the warnings, or an
 * error. On an error, the document does not change.
 *
 * - `"invalid-document"`: see {@link InvalidDocumentError}.
 * - `"conflict"`: see {@link MergeFromVersion}.
 */
export type MergedChangeResult =
  | MergedChangeOperations
  | InvalidDocumentError
  | ConflictError;

/**
 * A change of a client for a merge write: a text or BlockNote JSON, the
 * version that the client read, and what a conflict does.
 */
export type DocumentMergeChange = (TextChange | JSONChange) &
  MergeFromVersion<readonly LensBlock[]>;

/**
 * Computes the operations of a merge write. The client made the change at
 * the version `base`. The change merges three-way with the changes that
 * other writers made after `base` (see `merge/document.ts`): the operations
 * change the document of the editor, and keep the changes of other writers.
 * Nothing changes: {@link applyOperations} applies the operations to a
 * transaction of the caller. {@link updateDocumentWithMerge} computes and
 * applies them in one step.
 *
 * A write of the text of `base` without changes gives no operations.
 *
 * Throws as {@link computeOperations}.
 */
export function computeOperationsWithMerge(
  editor: BlockNoteEditor<any, any, any>,
  change: DocumentMergeChange,
): MergedChangeResult {
  return mergedOperationsOf(editor, change, editor.document);
}

/**
 * Computes the operations of a merge write (see
 * {@link computeOperationsWithMerge}), and applies them to the editor (see
 * {@link dispatchOperations}).
 */
export function updateDocumentWithMerge(
  editor: BlockNoteEditor<any, any, any>,
  change: DocumentMergeChange,
): MergedChangeResult {
  const update = computeOperationsWithMerge(editor, change);
  if (update.error === undefined) {
    dispatchOperations(editor, update.operations);
  }
  return update;
}

// The pipeline (see "Pipeline" in the README). A change runs these functions:
//
//   operationsOf       = textTarget (text: 1 Project, 2 Parse and align
//                        with parseAndAlign, 3 Target) or jsonTarget (JSON:
//                        2 Parse), then updateFromTarget (5 Fit, 6 Diff)
//   mergedOperationsOf = mergeOf (the stages 1 to 3 for a version, then
//                        4 Merge), the conflict rule, then operationsOfMerge
//                        (5 Fit, 6 Diff)
//   dispatchOperations = 7 Apply and 8 Dispatch
//
// Only a merge write has stage 4. A strict write examines `base` before
// stage 1 (see `changesAfterBase`), and then writes to the current document.
//
// The documents of a change:
//
// - `base`: the version that the client read, or `"current"`.
// - `current`: the document now. The operations change it. It does not have
//   to be the document of the editor: the editor supplies the schema and the
//   conversions.
// - `source`: the document that the change starts from: `current`, or
//   `base` for a merge write.
// - `target`: the document as the change asks for it (stage 3).

/**
 * The operations of a change for the document `current`, without a merge
 * (the stages 1 to 3, 5 and 6). The Y.Doc writes (`yjs/yDocText.ts`) also
 * use it, with `keepLayout` (see `fitResult`).
 *
 * @internal
 */
export function operationsOf(
  editor: BlockNoteEditor<any, any, any>,
  change: TextChange | JSONChange,
  current: readonly LensBlock[],
  keepLayout = false,
): ChangeOperations | InvalidDocumentError {
  assertBlockIds(current, "current document");
  const target =
    change.document === undefined
      ? textTarget(editor, change.format, current, change.text)
      : jsonTarget(editor, change.document);
  if (target.error !== undefined) {
    return target;
  }
  const update = updateFromTarget(
    schemaRulesOf(editor.schema.blockSchema),
    target.target,
    current,
    keepLayout,
  );
  return {
    operations: update.operations,
    warnings: [...target.warnings, ...update.warnings],
  };
}

/**
 * Stage 2 (Parse and align) of a text change. The format must show each
 * block of the parse (see `assertBlocksRoundTrip`).
 *
 * `testUtil/stages.ts` also uses it, thus the stage tests run the same code.
 *
 * @internal
 */
export function parseAndAlign(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  view: readonly ViewBlock[],
  content: string,
): ({ error?: undefined } & AlignedText) | { error: "invalid-document" } {
  const parsed = parseText(editor, format, content);
  if (parsed.error !== undefined) {
    return parsed;
  }
  assertBlocksRoundTrip(editor, format, parsed.blocks, view, content);
  const textBlocks = flattenBlocks(parsed.blocks);
  return { textBlocks, pairs: alignBlocks(view, textBlocks) };
}

/**
 * The input of stage 3 (Target, see `targetFromPairs`) for a text change.
 * `testUtil/stages.ts` also uses it.
 *
 * @internal
 */
export function targetInputOf(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  source: readonly LensBlock[],
  projection: Projection,
  { textBlocks, pairs }: AlignedText,
): TargetInput {
  return {
    source,
    projection,
    textBlocks,
    pairs,
    contentKindOf: schemaRulesOf(editor.schema.blockSchema).contentKindOf,
    shadowOf: (item) => shadowOf(editor, format, item),
    newId: () => UniqueID.options.generateID(),
  };
}

/**
 * Stages 5 and 6: the operations that change `current` to the fit of
 * `target`. A target without changes gives no operations.
 *
 * `testUtil/stages.ts` also uses it, thus the stage tests run the same code.
 *
 * @internal
 */
export function updateFromTarget(
  rules: SchemaRules,
  target: readonly LensBlock[],
  current: readonly LensBlock[],
  keepLayout = false,
): { operations: BlockOperation[]; warnings: FitWarning[] } {
  // 5. Fit.
  const fit = fitResult(rules, target, current, keepLayout);
  // 6. Diff. A block that changes between a layout block and a block with
  // content gets a new ID: the diff removes it and inserts the new block.
  const result = newIdsForLayoutChanges(
    current,
    fit,
    (type) => rules.layoutRuleOf(type) !== undefined,
    () => UniqueID.options.generateID(),
  );
  return {
    operations: diffDocuments(current, result),
    warnings: mergedCellsRemoved(current, fit),
  };
}

/**
 * The check of a strict write: the blocks that other writers changed after
 * the version `base`. The write applies only if there are none. The check
 * is one diff of the two documents, thus a write that does not apply costs
 * only this diff.
 *
 * `base` must be a document as the editor gives it (for example
 * `editor.document` at the read, also after `JSON.stringify` and
 * `JSON.parse`). A difference in the form (for example a block without its
 * default props) is a change for this check.
 *
 * @internal
 */
export function changesAfterBase(
  base: readonly LensBlock[],
  current: readonly LensBlock[],
): ChangeOfOthers[] {
  assertBlockIds(current, "current document");
  assertBlockIds(base, "base");
  return changesOfOthersOf(base, current);
}

/**
 * The changes of other writers between the version that a client read and
 * the current document, by block ID (see `ChangeOfOthers`).
 *
 * @internal
 */
export function changesOfOthersOf(
  base: readonly LensBlock[],
  current: readonly LensBlock[],
): ChangeOfOthers[] {
  return diffDocuments(base, current).map((operation): ChangeOfOthers => {
    switch (operation.type) {
      case "insert":
        return { id: operation.block.id, change: "added" };
      case "update":
        return { id: operation.id, change: "changed" };
      case "move":
        return { id: operation.id, change: "moved" };
      case "delete":
        return { id: operation.id, change: "removed" };
    }
  });
}

/**
 * Stages 7 and 8: applies the operations to a transaction of the editor (see
 * `applyOperations`), and dispatches it: in one transaction, or, for an
 * editor that is bound to a Y.Doc, in groups (see `dispatchUpdate`).
 *
 * @internal
 */
export function dispatchOperations(
  editor: BlockNoteEditor<any, any, any>,
  operations: readonly BlockOperation[],
): void {
  const tr = editor.prosemirrorState.tr;
  applyOperations(tr, operations);
  dispatchUpdate(editor, tr);
}

/**
 * Throws if a write has no `base`. The type requires it, but a caller without
 * types (for example JavaScript) can forget it. Without this check, such a
 * write would fail with an unclear error, or remove the changes of other
 * writers without a warning.
 *
 * @internal
 */
export function requireBase(base: unknown): void {
  if (base === undefined) {
    throw new Error(
      'A write needs the option `base`: "current", or the version that the client read.',
    );
  }
}

/**
 * The operations of a merge write for the document `current`: the merge of
 * the change with `current` (see {@link mergeOf}), the conflict rule, and
 * the operations (see {@link operationsOfMerge}).
 *
 * With `onConflict: "reject"`, a conflict of the merge gives the error
 * `"conflict"`, and no operations.
 *
 * @internal
 */
export function mergedOperationsOf(
  editor: BlockNoteEditor<any, any, any>,
  change: DocumentMergeChange,
  current: readonly LensBlock[],
): MergedChangeResult {
  requireBase(change.base);
  const merge = mergeOf(editor, change, change.base, current);
  if (merge.error !== undefined) {
    return merge;
  }
  if (change.onConflict === "reject" && merge.conflicts.length > 0) {
    return { error: "conflict", conflicts: merge.conflicts };
  }
  return operationsOfMerge(editor, merge, change.base, current);
}

/**
 * The merge of a change with the current document (the stages 1 to 4).
 *
 * @internal
 */
export type DocumentMerge = {
  error?: undefined;
  /** The target of the change for `base` (stage 3), and its warnings. */
  target: readonly LensBlock[];
  targetWarnings: TargetWarning[];
  /** The target, merged with the current document (stage 4). */
  merged: readonly LensBlock[];
  /** The conflicts of the merge. In each one, the current document won. */
  conflicts: MergeWarning[];
};

/**
 * The stages 1 to 4 of a merge write: the target of the change for the
 * version `base`, merged three-way with `current` (see `mergeDocument`). A
 * conflict is not an error here: the caller has the conflict rule.
 *
 * @internal
 */
export function mergeOf(
  editor: BlockNoteEditor<any, any, any>,
  change: TextChange | JSONChange,
  base: readonly LensBlock[],
  current: readonly LensBlock[],
): DocumentMerge | InvalidDocumentError {
  assertBlockIds(current, "current document");
  assertBlockIds(base, "base");
  const target = mergeTargetOf(editor, change, base, current);
  if (target.error !== undefined) {
    return target;
  }
  // 4. Merge.
  const merged = mergeDocument({
    base,
    ours: target.target,
    theirs: current,
    contentKindOf: schemaRulesOf(editor.schema.blockSchema).contentKindOf,
  });
  return {
    target: target.target,
    targetWarnings: target.warnings,
    merged: merged.blocks,
    conflicts: merged.warnings,
  };
}

/**
 * The stages 5 and 6 of a merge write: the operations that change `current`
 * to the merged document, with the changes of other writers after `base`,
 * and the document that the client wrote.
 *
 * @internal
 */
export function operationsOfMerge(
  editor: BlockNoteEditor<any, any, any>,
  merge: DocumentMerge,
  base: readonly LensBlock[],
  current: readonly LensBlock[],
): MergedChangeOperations {
  const rules = schemaRulesOf(editor.schema.blockSchema);
  const update = updateFromTarget(rules, merge.merged, current);
  return {
    operations: update.operations,
    warnings: [...merge.targetWarnings, ...merge.conflicts, ...update.warnings],
    changesOfOthers: changesOfOthersOf(base, current),
    // The client wrote the target: it gets the fit for the version that the
    // client read.
    written: fitResult(rules, merge.target, base, false),
  };
}

/** The target of a change, with the warnings of stage 3, or an error. */
type TargetOrError =
  | {
      error?: undefined;
      target: readonly LensBlock[];
      warnings: TargetWarning[];
    }
  | { error: "invalid-document" };

/**
 * The target of a merge: the change for the version `base`. In a JSON
 * change, a block with the ID of a block that another writer added after
 * the read of the client (the ID is in `current` but not in `base`) is a new
 * block: the client cannot mean that block (see `replaceDisallowedIds`).
 */
function mergeTargetOf(
  editor: BlockNoteEditor<any, any, any>,
  change: TextChange | JSONChange,
  base: readonly LensBlock[],
  current: readonly LensBlock[],
): TargetOrError {
  if (change.document === undefined) {
    return textTarget(editor, change.format, base, change.text);
  }
  const target = jsonTarget(editor, change.document);
  if (target.error !== undefined) {
    return target;
  }
  const read = new Set(new BlockIndex(base).ids);
  const idsOfOthers = new Set(
    new BlockIndex(current).ids.filter((id) => !read.has(id)),
  );
  return {
    target: replaceDisallowedIds(target.target, idsOfOthers),
    warnings: target.warnings,
  };
}

/**
 * The target of a JSON change: the JSON in the stored form (see
 * `parseJSON`). The JSON contains the block IDs, thus there is no
 * alignment: the JSON is the target.
 */
function jsonTarget(
  editor: BlockNoteEditor<any, any, any>,
  json: readonly PartialBlock<any, any, any>[],
): TargetOrError {
  const parsed = parseJSON(editor, json);
  return parsed.error !== undefined
    ? parsed
    : { target: parsed.blocks, warnings: [] };
}

/** The target of a text change (stages 1 to 3): `source` as `text` asks for it. */
function textTarget(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  source: readonly LensBlock[],
  text: string,
): TargetOrError {
  // 1. Project. No cache keeps the text or the projection between calls: a
  // server makes a new editor for each request, and a cache would keep a
  // document in its memory for each editor and format.
  // TODO (after all reviews): the performance pass, see "Items that are not
  // done" in the README.
  const sourceText = format.serialize(editor, source);
  const content = withoutByteOrderMark(text, sourceText);
  // An unchanged text needs no projection, and gives no operations (GetPut).
  if (content === sourceText) {
    return { target: source, warnings: [] };
  }
  const projection = projectDocument(editor, format, source, sourceText);
  // 2. Parse and align.
  const aligned = parseAndAlign(editor, format, projection.view, content);
  if (aligned.error !== undefined) {
    return aligned;
  }
  // 3. Target.
  return targetFromPairs(
    targetInputOf(editor, format, source, projection, aligned),
  );
}

/** The blocks of a text, in a flat list, and their pairs with the view blocks (stage 2). */
type AlignedText = { textBlocks: FlatBlock[]; pairs: BlockPair[] };
