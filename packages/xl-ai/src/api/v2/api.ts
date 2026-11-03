import {
  type BlockNoteEditor,
  docToBlocks,
  type PartialBlock,
} from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";
import type { Transaction } from "prosemirror-state";

import { alignBlocks } from "./alignment/alignBlocks.js";
import { flattenBlocks } from "./blocks/flatten.js";
import { BlockTree } from "./blocks/tree.js";
import { stableStringify } from "./blocks/json.js";
import { inlineContentToText } from "./blocks/text.js";
import type {
  ContentKind,
  LensBlock,
  LensInlineContent,
} from "./blocks/types.js";
import { toStoredBlocks } from "./formats/stored.js";
import type { TextFormat } from "./formats/types.js";
import { fixBlockIds } from "./operations/blockIds.js";
import {
  applyOperations,
  dispatchToEditor,
} from "./operations/applyOperations.js";
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
 * conversions. The Y.Doc API uses this.
 */
export function computeBlocksUpdate(
  editor: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions & {
    current: readonly LensBlock[];
    /** Keep the layout blocks, also if they become empty (see `updateToTarget`). */
    keepLayout?: boolean;
  },
): TextUpdate {
  const { base, current } = options;
  const plan = planTextUpdate(
    editor,
    options.format,
    base ?? current,
    options.text,
  );
  if (plan.error !== undefined) {
    return plan;
  }
  return updateToTarget(editor, plan, {
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
 * changes of other writers (see `rebase/`).
 */
export function computeJSONUpdate(
  editor: BlockNoteEditor<any, any, any>,
  options: JSONUpdateOptions,
): TextUpdate {
  return jsonUpdate(editor, options, editor.document);
}

/** Computes the operations with {@link computeJSONUpdate}, and applies them to the editor in one transaction. */
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
  const blocks = toStoredBlocks(
    editor,
    fitLayout(options.document, (type) => layoutRuleOf(editor, type)),
  );
  if (blocks === undefined) {
    return { error: "invalid-document" };
  }
  return updateToTarget(
    editor,
    {
      target: withUniqueIds(blocks, options.base ?? current, current, (type) =>
        isLayoutType(editor, type),
      ),
      warnings: [],
    },
    { base: options.base, current, keepLayout: false },
  );
}

/**
 * Computes an update for the document of the editor, and applies it. First,
 * the blocks without an ID get an ID: the update is for the document with
 * these IDs, thus the operations refer only to IDs that the document has.
 * `dispatch` gets a transaction of the editor state with the steps of the
 * IDs and of the operations. The default dispatches them in one
 * transaction. On an error, the document does not change.
 */
export function write(
  editor: BlockNoteEditor<any, any, any>,
  compute: (current: readonly LensBlock[]) => TextUpdate,
  dispatch: (tr: Transaction) => void = (tr) =>
    dispatchToEditor(editor, tr.steps),
): TextUpdate {
  const tr = editor.prosemirrorState.tr;
  fixBlockIds(tr);
  const update = compute(docToBlocks(tr.doc));
  if (update.error === undefined) {
    applyOperations(tr, update.operations);
    dispatch(tr);
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
  isLayout: (type: string) => boolean,
): LensBlock[] {
  const inBase = new Set(new BlockTree(base).ids);
  const inCurrent = new BlockTree(current).byId;
  const used = new Set<string>();
  function fix(block: LensBlock): LensBlock {
    const before = inCurrent.get(block.id);
    const keep =
      !used.has(block.id) &&
      (inBase.has(block.id) || before === undefined) &&
      (before === undefined || isLayout(before.type) === isLayout(block.type));
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
 * the operations for `base` move to `current` (see `rebase/`).
 *
 * The layout blocks of the result change to fit their child rules (see
 * `fitLayout`), unless `keepLayout` is set: without `base`, in the target;
 * with `base`, in the result on the current document, with more
 * operations. The client did not change the layout blocks, and in the
 * current document they can have blocks of other writers (for example a
 * column that another writer added). Thus, the rule applies to the result.
 */
function updateToTarget(
  editor: BlockNoteEditor<any, any, any>,
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
  function fit(blocks: readonly LensBlock[]): readonly LensBlock[] {
    return keepLayout
      ? blocks
      : fitLayout(blocks, (type) => layoutRuleOf(editor, type));
  }
  if (base === undefined) {
    return {
      operations: diffDocuments(current, fit(plan.target)),
      warnings: plan.warnings,
    };
  }
  const rebased = rebaseOperations({
    base,
    current,
    target: plan.target,
    operations: diffDocuments(base, plan.target),
    contentKindOf: (type) => contentKindOf(editor, type),
    canContain: (parent, child) => canContain(editor, parent, child),
  });
  return {
    operations: [
      ...rebased.operations,
      ...diffDocuments(rebased.result, fit(rebased.result)),
    ],
    warnings: [...plan.warnings, ...rebased.warnings],
  };
}

/**
 * Computes the operations with {@link computeTextUpdate}, and applies them to
 * the editor in one transaction. First, the blocks without an ID get an ID.
 */
export function updateDocumentFromText(
  editor: BlockNoteEditor<any, any, any>,
  options: TextUpdateOptions,
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
  // A byte order mark at the start of a text (for example of a file) is not
  // content.
  const content = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const projection = projectDocument(editor, format, document);
  if (content === projection.text) {
    return { target: document, warnings: [] };
  }

  const parsed = toStoredBlocks(editor, format.parse(editor, content));
  if (parsed === undefined) {
    return { error: "invalid-document" };
  }
  const incoming = flattenBlocks(parsed);
  const { target, warnings } = planTarget({
    document,
    projection,
    incoming,
    alignment: alignBlocks(projection.view, incoming),
    contentKindOf: (type) => contentKindOf(editor, type),
    shadowOf: shadowsOf(editor, format),
    newId: () => UniqueID.options.generateID(),
  });
  return { target, warnings };
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

/**
 * Returns true if a block of the type `parent` (`undefined` for the top
 * level) can have a child of the type `child`, by the child rules of the
 * block configs. A block placeable "namedOnly" (a column) is only in a
 * parent that allows its type by name.
 */
function canContain(
  editor: BlockNoteEditor<any, any, any>,
  parent: string | undefined,
  child: string,
): boolean {
  const rule =
    parent === undefined
      ? undefined
      : editor.schema.blockSchema[parent]?.children;
  if (editor.schema.blockSchema[child]?.placeable === "namedOnly") {
    return (
      rule !== undefined &&
      Array.isArray(rule.allow) &&
      rule.allow.includes(child)
    );
  }
  if (rule === undefined) {
    return true;
  }
  if (Array.isArray(rule.allow)) {
    return rule.allow.includes(child);
  }
  return !("exclude" in rule && rule.exclude?.includes(child));
}

function isLayoutType(
  editor: BlockNoteEditor<any, any, any>,
  type: string,
): boolean {
  return editor.schema.blockSchema[type]?.layoutOnly === true;
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
