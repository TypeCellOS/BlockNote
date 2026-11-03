import {
  type BlockNoteEditor,
  docToBlocks,
  type PartialBlock,
} from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import { alignBlocks } from "./alignment/alignBlocks.js";
import { flattenBlocks } from "./blocks/flatten.js";
import { type SchemaRules, schemaRulesOf } from "./blocks/schema.js";
import { BlockTree } from "./blocks/tree.js";
import { stableStringify } from "./blocks/json.js";
import { inlineContentToText } from "./blocks/text.js";
import type { LensBlock, LensInlineContent } from "./blocks/types.js";
import { toStoredBlocks } from "./formats/stored.js";
import type { TextFormat } from "./formats/types.js";
import { fixBlockIds, withDistinctIds } from "./operations/blockIds.js";
import { applyOperations } from "./operations/applyOperations.js";
import { dispatchUpdate } from "./operations/dispatch.js";
import { diffDocuments } from "./operations/diffDocuments.js";
import type { BlockOperation } from "./operations/types.js";
import { projectDocument } from "./projection/projectDocument.js";
import { mergeTree, type RebaseWarning } from "./merge/tree.js";
import { fitLayout } from "./target/fitLayout.js";
import {
  type FitWarning,
  fitTables,
  mergedCellsRemoved,
} from "./blocks/fitTable.js";
import { type PlanWarning, planTarget } from "./target/planTarget.js";

/** Returns the document in the format. A client reads this text, changes it, and writes it back. */
export function getDocumentText(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
): string {
  return format.serialize(editor, editor.document);
}

export type TextUpdateWarning = PlanWarning | RebaseWarning | FitWarning;

/** A write that applies: its operations and its warnings. */
export type ValidTextUpdate = {
  error?: undefined;
  operations: BlockOperation[];
  warnings: TextUpdateWarning[];
};

/**
 * The result of a write: the operations and the warnings, or an error. The
 * error `"invalid-document"` tells that the text or the JSON gives blocks
 * that do not fit the schema of the editor (for example an unknown block
 * type, or a table cell that spans more rows than the table has). Then the
 * document does not change.
 */
export type TextUpdate = ValidTextUpdate | { error: "invalid-document" };

export type TextUpdateOptions = {
  format: TextFormat;
  /** A text from {@link getDocumentText}, possibly with changes. */
  text: string;
  /**
   * The document at the version that the client read, if it is older than
   * the document of the editor. Get it from your version history. The result
   * then keeps the changes that other writers made after that version (see
   * `merge/tree.ts`). Without `base`, the text applies to the current document.
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
    /** Keep the layout blocks, also if they become empty (see `updateToTarget`). */
    keepLayout?: boolean;
  },
): TextUpdate {
  const { current } = options;
  const base = options.base && withDistinctIds(options.base);
  const plan = planTextUpdate(
    editor,
    options.format,
    base ?? current,
    options.text,
  );
  if (plan.error !== undefined) {
    return plan;
  }
  return updateToTarget(schemaRulesOf(editor), plan, {
    base,
    current,
    keepLayout: options.keepLayout ?? false,
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
  /** The document at the version that the client read (see {@link TextUpdateOptions}). */
  base?: readonly LensBlock[];
};

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
  // The layout rule applies to the JSON of the client, before the
  // conversion: the conversion fills a layout block with too few children
  // with new blocks (for example a column list with one column).
  const rules = schemaRulesOf(editor);
  const blocks = toStoredBlocks(
    editor,
    fitLayout(options.document, rules.layoutRuleOf),
  );
  if (blocks === undefined) {
    return { error: "invalid-document" };
  }
  const base = options.base && withDistinctIds(options.base);
  return updateToTarget(
    rules,
    {
      target: withUniqueIds(
        blocks,
        base ?? current,
        current,
        rules.layoutRuleOf,
      ),
      warnings: [],
    },
    { base, current, keepLayout: false },
  );
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
 * Returns the blocks with a new ID where an ID cannot identify the block: a
 * later block with the ID of an earlier block, a block with an ID that is
 * not in `base` but is in `current` (a block of another writer), or a block
 * that changes between a layout type and another type (for example a column
 * that becomes a paragraph: it cannot change in place). These blocks are new
 * blocks.
 */
function withUniqueIds(
  blocks: readonly LensBlock[],
  base: readonly LensBlock[],
  current: readonly LensBlock[],
  layoutRuleOf: SchemaRules["layoutRuleOf"],
): LensBlock[] {
  const inBase = new Set(new BlockTree(base).ids);
  const inCurrent = new BlockTree(current).byId;
  const used = new Set<string>();
  function fix(block: LensBlock): LensBlock {
    const before = inCurrent.get(block.id);
    const keep =
      !used.has(block.id) &&
      (inBase.has(block.id) || before === undefined) &&
      (before === undefined ||
        (layoutRuleOf(before.type) === undefined) ===
          (layoutRuleOf(block.type) === undefined));
    const id = keep ? block.id : UniqueID.options.generateID();
    used.add(id);
    return { ...block, id, children: block.children.map(fix) };
  }
  return blocks.map(fix);
}

/**
 * Returns the update that changes `current` to the target document of the
 * plan. The plan is for `base`, or for `current` if there is no `base`. A
 * plan without changes gives no operations. With `base` (an older version),
 * the target merges three-way with `current` (see `mergeTree`), and the
 * operations change `current` to the result.
 *
 * The layout blocks of the result change to fit their child rules (see
 * `fitLayout`), unless `keepLayout` is set: without `base`, in the target;
 * with `base`, in the result on the current document, with more
 * operations. The client did not change the layout blocks, and in the
 * current document they can have blocks of other writers (for example a
 * column that another writer added). Thus, the rule applies to the result.
 */
function updateToTarget(
  rules: SchemaRules,
  plan: { target: readonly LensBlock[]; warnings: PlanWarning[] },
  documents: {
    /** The document at the version that the client read, if it is older than `current`. */
    base: readonly LensBlock[] | undefined;
    current: readonly LensBlock[];
    keepLayout: boolean;
  },
): ValidTextUpdate {
  const { base, current, keepLayout } = documents;
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
        });
  const result = fitTables(
    keepLayout
      ? merged.blocks
      : fitLayout(merged.blocks, rules.layoutRuleOf, rules.canContain),
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
 * {@link updateToTarget}). The Y.Doc API uses this.
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
):
  | { error?: undefined; target: readonly LensBlock[]; warnings: PlanWarning[] }
  | { error: "invalid-document" } {
  const serialized = format.serialize(editor, document);
  // A byte order mark at the start of a text (for example of a file) is not
  // content, unless the document starts with that character.
  const content =
    text.startsWith("\uFEFF") && !serialized.startsWith("\uFEFF")
      ? text.slice(1)
      : text;
  // An unchanged text needs no projection.
  if (content === serialized) {
    return { target: document, warnings: [] };
  }
  const projection = projectDocument(editor, format, document, serialized);

  const parsed = toStoredBlocks(editor, format.parse(editor, content));
  if (parsed === undefined) {
    return { error: "invalid-document" };
  }
  const incoming = flattenBlocks(parsed);
  return planTarget({
    document,
    projection,
    incoming,
    alignment: alignBlocks(projection.view, incoming),
    contentKindOf: schemaRulesOf(editor).contentKindOf,
    shadowOf: shadowsOf(editor, format),
    newId: () => UniqueID.options.generateID(),
  });
}

/**
 * Returns the text that the format shows for an inline item that its parse
 * does not give back, for example "@Bob" for a mention in markdown (see
 * `MergeOptions.shadowOf`). `undefined` if the parse gives back an item of
 * that type. One serialize and one parse for each different item.
 */
function shadowsOf(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
): (item: LensInlineContent) => string | undefined {
  const shadows = new Map<string, string | undefined>();
  return (item) => {
    const key = stableStringify(item);
    if (!shadows.has(key)) {
      const [block] = format.parse(
        editor,
        format.serialize(editor, [
          {
            id: "",
            type: "paragraph",
            props: {},
            content: [item],
            children: [],
          },
        ]),
      );
      const content = block?.content;
      shadows.set(
        key,
        Array.isArray(content) &&
          !content.some((part) => part.type === item.type)
          ? inlineContentToText(content)
          : undefined,
      );
    }
    return shadows.get(key);
  };
}
