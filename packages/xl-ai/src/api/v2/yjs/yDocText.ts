import { type BlockNoteEditor, docToBlocks } from "@blocknote/core";
import {
  updateYFragment,
  yXmlFragmentToProseMirrorRootNode,
} from "@blocknote/core/yjs";
import type { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import * as Y from "yjs";

import {
  computeBlocksUpdate,
  type TextUpdate,
  type TextUpdateOptions,
} from "../api.js";
import type { TextFormat } from "../formats/types.js";
import { applyOperations } from "../operations/applyOperations.js";
import { addMissingBlockIds } from "../operations/blockIds.js";

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
 *   is a removal and an insert. Thus, concurrent moves give duplicate blocks
 *   or lose changes. A flat document model in the binding will remove this
 *   problem.
 */
export type MergeStrategy = "rebase" | "yjs";

export type YDocTextUpdate = TextUpdate & {
  /** The Yjs update that the write applied. Send it to the other clients. */
  update: Uint8Array;
};

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
 * With the "yjs" strategy, the operations of the result are for `base`. With
 * the "rebase" strategy, they are for the current document.
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

  if (base === undefined || strategy === "rebase") {
    const before = Y.encodeStateVector(ydoc);
    const update = writeText(editor, ydoc, fragment, {
      ...textOptions,
      base:
        base === undefined
          ? undefined
          : docToBlocks(readDocument(editor, base, fragment)),
    });
    return { ...update, update: Y.encodeStateAsUpdate(ydoc, before) };
  }

  const copy = base;
  const baseVector = Y.encodeStateVector(copy);
  const update = writeText(editor, copy, fragment, textOptions);
  const yUpdate = Y.encodeStateAsUpdate(copy, baseVector);
  Y.applyUpdate(ydoc, yUpdate);
  return { ...update, update: yUpdate };
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
  const copy = docFromState(Y.encodeStateAsUpdate(ydoc));
  let changed = false;
  copy.on("update", () => {
    changed = true;
  });
  const doc = yXmlFragmentToProseMirrorRootNode(
    copy.getXmlFragment(fragmentName),
    editor.pmSchema,
  );
  if (changed) {
    throw new Error(
      "The schema of the editor cannot read all content of the Y.Doc. Use an editor with the schema and the extensions of the document (for example comments).",
    );
  }
  return doc;
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
 * Writes each ProseMirror step to `ydoc` alone, in one Yjs transaction. Thus,
 * each Yjs change is as small as its step, and other clients get one update.
 */
function writeText(
  editor: BlockNoteEditor<any, any, any>,
  ydoc: Y.Doc,
  fragmentName: string,
  options: TextUpdateOptions,
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
  applyOperations(tr, update.operations);
  if (tr.steps.length === 0) {
    return update;
  }

  const meta = { mapping: new Map(), isOMark: new Map() };
  let doc = tr.before;
  ydoc.transact(() => {
    updateYFragment(ydoc, fragment, doc, meta);
    for (const step of tr.steps) {
      const result = step.apply(doc);
      if (result.doc === null) {
        throw new Error(`Step does not apply again: ${result.failed}`);
      }
      doc = result.doc;
      updateYFragment(ydoc, fragment, doc, meta);
    }
  });
  return update;
}
