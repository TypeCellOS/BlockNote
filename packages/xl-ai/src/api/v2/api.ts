import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import { alignBlocks } from "./alignment/index.js";
import type { LensBlock } from "./model.js";
import {
  assertBlockIds,
  BlockTree,
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
  documentText,
  shadowsOf,
} from "./projection/index.js";
import { mergeTree, type MergeWarning } from "./merge/index.js";
import { fitResult, type FitWarning, mergedCellsRemoved } from "./fit/index.js";
import { targetFromPairs, type TargetWarning } from "./target/index.js";

/** Returns the document in the format. A client reads this text, changes it, and writes it back. */
export function getDocumentText(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
): string {
  return documentText(editor, format, editor.document).text;
}

export type ChangeWarning = TargetWarning | MergeWarning | FitWarning;

/** A change that applies: its operations and its warnings. */
export type ChangeOperations = {
  error?: undefined;
  operations: BlockOperation[];
  warnings: ChangeWarning[];
};

/** A change with `onConflict: "reject"` that has conflicts: nothing applies. */
export type ConflictError = { error: "conflict"; conflicts: MergeWarning[] };

/**
 * The result of a change: the operations and the warnings, or an error. On
 * an error, the document does not change.
 *
 * - `"invalid-document"`: the text or the JSON gives blocks that do not fit
 *   the schema of the editor (for example an unknown block type, or a table
 *   cell that spans more rows than the table has).
 * - `"conflict"`: see {@link WriteFromVersion}.
 */
export type ChangeResult =
  | ChangeOperations
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
       * What a conflict (a {@link MergeWarning}) does:
       *
       * - `"keep-current"` (the default): the change of the other writer
       *   stays there, and the result has the warning. The other changes of
       *   the client apply.
       * - `"reject"`: nothing applies, and the result is the error
       *   `"conflict"`, with the conflicts.
       */
      onConflict?: "keep-current" | "reject";
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
   * one ID gives the error `"invalid-document"`. With `base`, a block gets a
   * new ID if its ID is not in `base` but is in the current document, as the
   * ID of a block of another writer.
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
 * The operations change only the blocks and fields that the client changed.
 * They keep the data that the change does not show: for a text, examples are
 * block IDs, some props and styles, and blocks that the format does not
 * render. With a version as `base`, they keep the changes of other writers
 * (see `merge/tree.ts`).
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
  return operationsOf(editor, change, editor.document);
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

// The pipeline (see "Pipeline" in the README). A change runs these functions:
//
//   operationsOf       = textTarget (text: 1 Project, 2 Parse and align,
//                        3 Target) or jsonTarget (JSON: 2 Parse, and the IDs)
//                        then updateFromTarget (4 Merge, 5 Fit, 6 Diff)
//   dispatchOperations = 7 Apply and 8 Dispatch
//
// The documents of a change:
//
// - `base`: the version that the client read, or `undefined` for
//   `base: "current"`.
// - `current`: the document now. The operations change it. It does not have
//   to be the document of the editor: the editor supplies the schema and the
//   conversions.
// - `source`: the document that the change starts from (`base ?? current`).
// - `target`: the document as the change asks for it (stage 3).

/**
 * The operations of a change for the document `current` (stages 1 to 6).
 * The Y.Doc write (`yjs/yDocText.ts`) also uses it, with `keepLayout` (see
 * `fitResult`).
 *
 * @internal
 */
export function operationsOf(
  editor: BlockNoteEditor<any, any, any>,
  change: DocumentChange,
  current: readonly LensBlock[],
  keepLayout = false,
): ChangeResult {
  assertBlockIds(current, "current document");
  const base = versionOf(change);
  const source = base ?? current;
  const target =
    change.document === undefined
      ? textTarget(editor, change.format, source, change.text)
      : jsonTarget(editor, change.document, source, current);
  if (target.error !== undefined) {
    return target;
  }
  return updateFromTarget(schemaRulesOf(editor), target, {
    base,
    current,
    onConflict: change.onConflict,
    keepLayout,
  });
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
 * The target of a JSON change: the JSON in the stored form (see
 * `parseJSON`). The JSON contains the block IDs, thus there is no
 * alignment: the JSON is the target. A block with the ID of a block that
 * another writer added after the read of the client (the ID is in `current`
 * but not in `source`) is a new block: the client cannot mean that block
 * (see `replaceDisallowedIds`).
 */
function jsonTarget(
  editor: BlockNoteEditor<any, any, any>,
  json: readonly PartialBlock<any, any, any>[],
  source: readonly LensBlock[],
  current: readonly LensBlock[],
): TargetOrError {
  const parsed = parseJSON(editor, json);
  if (parsed.error !== undefined) {
    return parsed;
  }
  const read = new Set(new BlockTree(source).ids);
  const disallowedIds = new Set(
    new BlockTree(current).ids.filter((id) => !read.has(id)),
  );
  return {
    target: replaceDisallowedIds(parsed.blocks, disallowedIds),
    warnings: [],
  };
}

/** The target of a text change (stages 1 to 3): `source` as `text` asks for it. */
function textTarget(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  source: readonly LensBlock[],
  text: string,
): TargetOrError {
  // 1. Project. The text of the source and its projection come from the
  // cache, if the source is the last document of the editor and format.
  const read = documentText(editor, format, source);
  const content = withoutByteOrderMark(text, read.text);
  // An unchanged text needs no projection, and gives no operations (GetPut).
  if (content === read.text) {
    return { target: source, warnings: [] };
  }
  const projection = read.projection();
  // 2. Parse and align. The format must show each block of the parse (see
  // `assertBlocksRoundTrip`).
  const parsed = parseText(editor, format, content);
  if (parsed.error !== undefined) {
    return parsed;
  }
  assertBlocksRoundTrip(
    editor,
    format,
    parsed.blocks,
    projection.view,
    content,
  );
  const textBlocks = flattenBlocks(parsed.blocks);
  const pairs = alignBlocks(projection.view, textBlocks);
  // 3. Target.
  return targetFromPairs({
    source,
    projection,
    incoming: textBlocks,
    alignment: pairs,
    contentKindOf: schemaRulesOf(editor).contentKindOf,
    shadowOf: shadowsOf(editor, format),
    newId: () => UniqueID.options.generateID(),
  });
}

/**
 * Stages 4 to 6: the operations that change `current` to the result of the
 * target. A target without changes gives no operations.
 *
 * With `onConflict: "reject"`, a conflict of the merge gives the error
 * `"conflict"`, and no operations.
 */
function updateFromTarget(
  rules: SchemaRules,
  {
    target,
    warnings,
  }: { target: readonly LensBlock[]; warnings: TargetWarning[] },
  documents: {
    base: readonly LensBlock[] | undefined;
    current: readonly LensBlock[];
    onConflict: "keep-current" | "reject" | undefined;
    keepLayout?: boolean;
  },
): ChangeOperations | ConflictError {
  const { base, current } = documents;
  if (target === (base ?? current)) {
    return { operations: [], warnings };
  }
  // 4. Merge: only for a version as `base`. The target is for that version,
  // and merges three-way with the current document (see `mergeTree`).
  const merged: { blocks: readonly LensBlock[]; warnings: MergeWarning[] } =
    base === undefined
      ? { blocks: target, warnings: [] }
      : mergeTree({
          base,
          ours: target,
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
  // 6. Diff. A block that changes between a layout block and a block with
  // content gets a new ID: the diff removes it and inserts the new block.
  const operations = diffDocuments(
    current,
    newIdsForLayoutChanges(
      current,
      result,
      (type) => rules.layoutRuleOf(type) !== undefined,
      () => UniqueID.options.generateID(),
    ),
  );
  return {
    operations,
    warnings: [
      ...warnings,
      ...merged.warnings,
      ...mergedCellsRemoved(current, result),
    ],
  };
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
 * The version that the write merges from, or `undefined` for a write on the
 * current document (`base: "current"`).
 */
function versionOf(
  options: WriteFromVersion<readonly LensBlock[]>,
): readonly LensBlock[] | undefined {
  requireBase(options.base);
  if (options.base === "current") {
    return undefined;
  }
  assertBlockIds(options.base, "base");
  return options.base;
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
