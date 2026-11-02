import { BlockNoteEditor } from "@blocknote/core";
import { updateYFragment, yDocToBlocks } from "@blocknote/core/yjs";
import * as Y from "yjs";

import {
  computeTextUpdate,
  type TextUpdate,
  type TextUpdateOptions,
} from "../api.js";
import type { TextFormat } from "../formats/types.js";
import { applyBlockOperations } from "../operations/applyOperations.js";

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
    yDocToBlocks(editor, ydoc, options.fragment),
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
  const { base, strategy = "rebase", ...textOptions } = options;
  const fragment = options.fragment ?? "prosemirror";

  if (base === undefined || strategy === "rebase") {
    const before = Y.encodeStateVector(ydoc);
    const update = writeText(editor, ydoc, fragment, {
      ...textOptions,
      base:
        base === undefined
          ? undefined
          : yDocToBlocks(editor, docFromState(base), fragment),
    });
    return { ...update, update: Y.encodeStateAsUpdate(ydoc, before) };
  }

  const copy = docFromState(base);
  const baseVector = Y.encodeStateVector(copy);
  const update = writeText(editor, copy, fragment, textOptions);
  const yUpdate = Y.encodeStateAsUpdate(copy, baseVector);
  Y.applyUpdate(ydoc, yUpdate);
  return { ...update, update: yUpdate };
}

function docFromState(state: Uint8Array): Y.Doc {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, state);
  return ydoc;
}

/**
 * Applies the text to the document of `ydoc` with an editor without a view.
 * Writes each ProseMirror step to `ydoc` alone. Thus, each Yjs change is as
 * small as its step, also if one transaction changes text at more than one
 * place.
 */
function writeText(
  editor: BlockNoteEditor<any, any, any>,
  ydoc: Y.Doc,
  fragmentName: string,
  options: TextUpdateOptions,
): TextUpdate {
  const fragment = ydoc.getXmlFragment(fragmentName);
  const blocks = yDocToBlocks(editor, ydoc, fragmentName);
  const lens = BlockNoteEditor.create({
    schema: editor.schema,
    initialContent: blocks.length > 0 ? blocks : undefined,
    trailingBlock: false,
  });

  const update = computeTextUpdate(lens, options);
  const meta = { mapping: new Map(), isOMark: new Map() };
  let doc = lens.prosemirrorState.doc;
  const write = () => updateYFragment(ydoc, fragment, doc, meta);

  // One Yjs transaction, thus other clients get one update.
  ydoc.transact(() => {
    write();
    for (const step of applyBlockOperations(lens, update.operations)) {
      const result = step.apply(doc);
      if (result.doc === null) {
        throw new Error(`Step does not apply again: ${result.failed}`);
      }
      doc = result.doc;
      write();
    }
    // Also write the changes that plugins appended to the transaction.
    doc = lens.prosemirrorState.doc;
    write();
  });
  return update;
}
