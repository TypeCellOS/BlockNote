import { BlockNoteEditor, type BlockNoteEditorOptions } from "@blocknote/core";
import { blockNoteTransformer, withCollaboration } from "@blocknote/core/y";
import { ynodeToPmnode } from "@y/prosemirror";
import type * as Y from "@y/y";
import { afterEach } from "vite-plus/test";

import type { TextFormat } from "../formats/types.js";
import { getYDocText } from "../y/index.js";

/** The editors that `bindEditor` mounted, and that are still mounted. */
const mounted = new Set<BlockNoteEditor<any, any, any>>();

// A mounted editor stays bound to its Y.Doc. Thus, each test unmounts its
// editors at its end.
afterEach(() => {
  for (const editor of mounted) {
    editor.unmount();
  }
  mounted.clear();
});

/**
 * An editor that is bound to the fragment with the Yjs 14 binding
 * (`withCollaboration` of `@blocknote/core/y`) and mounted: a client of the
 * Y.Doc, for example a user who types. The lens does not need such an editor
 * to write to a Y.Doc. Each call gives a new client. The editor unmounts at
 * the end of the test, or with {@link unbindEditor}.
 */
export function bindEditor(
  fragment: Y.Node,
  options: Partial<BlockNoteEditorOptions<any, any, any>> = {},
): BlockNoteEditor<any, any, any> {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      ...options,
      collaboration: { fragment, user: { name: "User", color: "#000000" } },
    }),
  );
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor.mount(element);
  mounted.add(editor);
  return editor;
}

/** Unmounts an editor of {@link bindEditor}. Thus, it is not a client of the Y.Doc any more. */
export function unbindEditor(editor: BlockNoteEditor<any, any, any>) {
  editor.unmount();
  mounted.delete(editor);
}

/**
 * The text of the fragment, as an editor with the options reads it. The
 * editor is not bound to the Y.Doc, and has no view.
 */
export function readText(
  fragment: Y.Node,
  format: TextFormat,
  options: Partial<BlockNoteEditorOptions<any, any, any>> = {},
): string {
  return getYDocText(BlockNoteEditor.create(options), fragment, format);
}

/**
 * The IDs of the block nodes of the fragment, from the document that the
 * binding of an editor gives for it. A block without an ID gives `null`:
 * the blocks of `yDocToBlocks` do not show that (a block without an ID gets
 * a new ID in the conversion).
 */
export function blockNodeIds(
  fragment: Y.Node,
  editor: BlockNoteEditor<any, any, any> = BlockNoteEditor.create(),
): unknown[] {
  const ids: unknown[] = [];
  ynodeToPmnode(fragment, editor.pmSchema, {
    renderer: null,
    transformer: blockNoteTransformer,
  }).descendants((node) => {
    if (node.type.isInGroup("bnBlock")) {
      ids.push(node.attrs.id);
    }
    return !node.isTextblock;
  });
  return ids;
}
