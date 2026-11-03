import { type BlockNoteEditor, docToBlocks } from "@blocknote/core";
import { yXmlFragmentToProseMirrorRootNode } from "@blocknote/core/yjs";
import type { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import * as Y from "yjs";

import {
  computeBlocksUpdate,
  type TextUpdate,
  type TextUpdateOptions,
  type ValidTextUpdate,
} from "../api.js";
import type { TextFormat } from "../formats/types.js";
import { applyOperations } from "../operations/applyOperations.js";
import { addMissingBlockIds } from "../operations/blockIds.js";
import { writeSteps } from "./writeSteps.js";

/** The name of the Y.XmlFragment of a BlockNote document, if the options do not give one. */
const DEFAULT_FRAGMENT = "prosemirror";

export type YDocTextOptions = {
  format: TextFormat;
  /** The name of the Y.XmlFragment of the document. The default is "prosemirror". */
  fragment?: string;
};

/**
 * How a write merges the text with the changes of other writers after `base`:
 *
 * - `"rebase"`: the lens moves the changes of the text to the current
 *   document (see `rebase/`), and applies them there.
 * - `"yjs"`: the lens applies the changes of the text to a copy of `base`,
 *   and Yjs merges the copy into the document. In the Yjs binding now, a move
 *   is a removal and an insert. Thus, if another writer changes a block that
 *   the text moves, the change is lost. A flat document model in the binding
 *   will remove this problem. Yjs does not know the schema. If the merge
 *   gives a document that does not fit the schema (for example a block group
 *   without blocks, if two writers keep different blocks), or two blocks with
 *   the same ID (two writers move the same block), the write uses the
 *   "rebase" strategy.
 */
export type MergeStrategy = "rebase" | "yjs";

/** The result of a write to a Y.Doc. On an error, the Y.Doc does not change. */
export type YDocTextUpdate =
  | (ValidTextUpdate & {
      /** The Yjs update that the write applied. Send it to the other clients. */
      update: Uint8Array;
      /**
       * The strategy that the write used. It can be "rebase" for a write with
       * the "yjs" strategy (see {@link MergeStrategy}).
       */
      strategy: MergeStrategy;
    })
  | { error: "invalid-document" };

/** Returns the document of the Y.Doc as text. */
export function getYDocText(
  editor: BlockNoteEditor<any, any, any>,
  ydoc: Y.Doc,
  options: YDocTextOptions,
): string {
  return options.format.serialize(
    editor,
    docToBlocks(
      readDocument(editor, ydoc, options.fragment ?? DEFAULT_FRAGMENT),
    ),
  );
}

/**
 * Writes text back to the Y.Doc. The text can come from an older version of
 * the document (`base`). The result keeps the changes that other writers made
 * after that version. `strategy` selects how (the default is "rebase").
 *
 * The `strategy` of the result tells which strategy the write used. With the
 * "yjs" strategy, the operations of the result are for `base`. With the
 * "rebase" strategy, they are for the current document. A write from an
 * empty base always uses the "rebase" strategy.
 */
export function updateYDocFromText(
  editor: BlockNoteEditor<any, any, any>,
  ydoc: Y.Doc,
  options: YDocTextOptions & {
    text: string;
    /** The Yjs state (`Y.encodeStateAsUpdate`) at the version that the client read. Without `base`, the text applies to the current document. */
    base?: Uint8Array;
    strategy?: MergeStrategy;
  },
): YDocTextUpdate {
  const { strategy = "rebase", base: baseState, ...textOptions } = options;
  const fragment = options.fragment ?? DEFAULT_FRAGMENT;
  const baseDoc = baseState === undefined ? undefined : docFromState(baseState);
  // A base without content and a Y.Doc without content are the same empty
  // document: no other writer changed it.
  const base =
    baseDoc !== undefined &&
    (baseDoc.getXmlFragment(fragment).length > 0 ||
      ydoc.getXmlFragment(fragment).length > 0)
      ? baseDoc
      : undefined;

  // A copy of an empty base gets its own root block group. Yjs cannot merge
  // two new root structures into one: the Y.Doc would have two root block
  // groups, and a read would show only one. Thus, a write from an empty
  // base uses the "rebase" strategy.
  if (
    base === undefined ||
    strategy === "rebase" ||
    base.getXmlFragment(fragment).length === 0
  ) {
    return rebaseWrite();
  }

  // A copy, because `rebaseWrite` reads `base`.
  const copy = docFromState(Y.encodeStateAsUpdate(base));
  const baseVector = Y.encodeStateVector(copy);
  // The layout blocks stay, also if they become empty: Yjs cannot merge the
  // removal of a column with a block that another writer adds to it.
  const update = writeText(editor, copy, fragment, {
    ...textOptions,
    keepLayout: true,
  });
  if (update.error !== undefined) {
    return update;
  }
  const yUpdate = Y.encodeStateAsUpdate(copy, baseVector);
  const merged = docFromState(Y.encodeStateAsUpdate(ydoc));
  Y.applyUpdate(merged, yUpdate);
  const mergedDocument = tryReadDocument(editor, merged, fragment);
  if (mergedDocument === undefined || !hasUniqueBlockIds(mergedDocument)) {
    return rebaseWrite();
  }
  Y.applyUpdate(ydoc, yUpdate);
  return { ...update, update: yUpdate, strategy: "yjs" };

  function rebaseWrite(): YDocTextUpdate {
    const before = Y.encodeStateVector(ydoc);
    const update = writeText(editor, ydoc, fragment, {
      ...textOptions,
      base:
        base === undefined
          ? undefined
          : docToBlocks(readDocument(editor, base, fragment)),
    });
    return update.error === undefined
      ? {
          ...update,
          update: Y.encodeStateAsUpdate(ydoc, before),
          strategy: "rebase",
        }
      : update;
  }
}

/** Returns true if no two blocks of the document have the same ID. */
function hasUniqueBlockIds(doc: Node): boolean {
  const ids = new Set<unknown>();
  let unique = true;
  doc.descendants((node) => {
    if (node.type.isInGroup("bnBlock") && node.attrs.id !== null) {
      unique &&= !ids.has(node.attrs.id);
      ids.add(node.attrs.id);
    }
    return unique;
  });
  return unique;
}

/**
 * Reads the fragment of the Y.Doc as a ProseMirror document, with the schema
 * of the editor. y-prosemirror removes content that the schema cannot read
 * from the Y.Doc. Thus, the function reads a copy, and gives an error if the
 * schema cannot read all of it. Then nothing changes and nothing is lost.
 */
function readDocument(
  editor: BlockNoteEditor<any, any, any>,
  ydoc: Y.Doc,
  fragmentName: string,
): Node {
  const doc = tryReadDocument(editor, ydoc, fragmentName);
  if (doc === undefined) {
    throw new Error(
      "The schema of the editor cannot read all content of the Y.Doc. Use an editor with the schema and the extensions of the document (for example comments).",
    );
  }
  return doc;
}

/** Reads the fragment as `readDocument` does. Returns `undefined` if the schema cannot read all of it. */
function tryReadDocument(
  editor: BlockNoteEditor<any, any, any>,
  ydoc: Y.Doc,
  fragmentName: string,
): Node | undefined {
  const copy = docFromState(Y.encodeStateAsUpdate(ydoc));
  let changed = false;
  copy.on("update", () => {
    changed = true;
  });
  const doc = yXmlFragmentToProseMirrorRootNode(
    copy.getXmlFragment(fragmentName),
    editor.pmSchema,
  );
  return changed ? undefined : doc;
}

function docFromState(state: Uint8Array): Y.Doc {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, state);
  return ydoc;
}

/**
 * Applies the text to the document of `ydoc`. The operations apply to a
 * ProseMirror copy of the fragment, with the schema of the editor. Thus,
 * marks that are not in the Block JSON stay, for example comments (if the
 * editor has the comments extension).
 *
 * The copy is the document as an editor has it: an empty fragment gives one
 * empty block, and each block has an ID.
 *
 * Writes each ProseMirror step to `ydoc` alone, in one Yjs transaction (see
 * `writeSteps`). Thus, each Yjs change is as small as its step, and other
 * clients get one update.
 */
function writeText(
  editor: BlockNoteEditor<any, any, any>,
  ydoc: Y.Doc,
  fragmentName: string,
  options: TextUpdateOptions & { keepLayout?: boolean },
): TextUpdate {
  const fragment = ydoc.getXmlFragment(fragmentName);
  const read = readDocument(editor, ydoc, fragmentName);
  const tr = EditorState.create({
    doc: read.type.createAndFill(null, read.content) ?? read,
  }).tr;
  addMissingBlockIds(tr);

  const update = computeBlocksUpdate(editor, {
    ...options,
    current: docToBlocks(tr.doc),
  });
  if (update.error !== undefined) {
    return update;
  }
  applyOperations(tr, update.operations);
  if (tr.steps.length === 0) {
    return update;
  }

  writeSteps(ydoc, fragment, tr);
  return update;
}
