import { BlockNoteEditor, type BlockNoteEditorOptions } from "@blocknote/core";
import { withCollaboration } from "@blocknote/core/yjs";
import { afterEach } from "vite-plus/test";
import type * as Y from "yjs";

import { getDocumentText } from "../api.js";
import type { TextFormat } from "../formats/types.js";

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
 * An editor that is bound to the fragment and mounted, as `updateYDocFromText`
 * needs it. Each call gives a new client of the Y.Doc. The editor unmounts at
 * the end of the test, or with {@link unbindEditor}.
 */
export function bindEditor(
  fragment: Y.XmlFragment,
  options: Partial<BlockNoteEditorOptions<any, any, any>> = {},
): BlockNoteEditor<any, any, any> {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      ...options,
      collaboration: { fragment, user: { name: "Lens", color: "#000000" } },
    }),
  );
  editor.mount(document.createElement("div"));
  mounted.add(editor);
  return editor;
}

/** Unmounts an editor of {@link bindEditor}. Thus, it is not a client of the Y.Doc any more. */
export function unbindEditor(editor: BlockNoteEditor<any, any, any>) {
  editor.unmount();
  mounted.delete(editor);
}

/** The text of the Y.Doc, as a new client reads it. */
export function readText(
  fragment: Y.XmlFragment,
  format: TextFormat,
  options: Partial<BlockNoteEditorOptions<any, any, any>> = {},
): string {
  const editor = bindEditor(fragment, options);
  const text = getDocumentText(editor, format);
  unbindEditor(editor);
  return text;
}
