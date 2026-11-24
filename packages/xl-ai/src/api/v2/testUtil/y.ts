import type { BlockNoteEditor, BlockNoteEditorOptions } from "@blocknote/core";
import { blockNoteTransformer, withCollaboration } from "@blocknote/core/y";
import { ynodeToPmnode } from "@y/prosemirror";
import type * as Y from "@y/y";

/**
 * The `setupEditor` fixture of the browser tests, as {@link bindEditor} uses
 * it. The fixture is in `tests/`, outside the build of this package, thus
 * this type gives only the part that the helper needs.
 */
type SetupMountedEditor = (
  options: any,
) => Promise<{ editor: BlockNoteEditor<any, any, any> }>;

/**
 * The options of an editor that is bound to the fragment with the Yjs 14
 * binding (`withCollaboration` of `@blocknote/core/y`). Mounted, such an
 * editor is a client of the Y.Doc, for example a user who types. The lens
 * does not need such an editor to write to a Y.Doc.
 */
export function boundEditorOptions(
  fragment: Y.Node,
  options: Partial<BlockNoteEditorOptions<any, any, any>> = {},
) {
  return withCollaboration({
    ...options,
    collaboration: { fragment, user: { name: "User", color: "#000000" } },
  });
}

/**
 * An editor of the fixture that is bound to the fragment (see
 * {@link boundEditorOptions}) and mounted in the DOM: a new client of the
 * Y.Doc. The fixture unmounts and destroys it at the end of the test. Use
 * {@link unbindEditor} to end the client before.
 */
export async function bindEditor(
  setupEditor: SetupMountedEditor,
  fragment: Y.Node,
  options: Partial<BlockNoteEditorOptions<any, any, any>> = {},
): Promise<BlockNoteEditor<any, any, any>> {
  const { editor } = await setupEditor({
    mountType: "dom",
    ...boundEditorOptions(fragment, options),
  });
  return editor;
}

/** Unmounts an editor of {@link bindEditor}. Thus, it is not a client of the Y.Doc any more. */
export function unbindEditor(editor: BlockNoteEditor<any, any, any>) {
  editor.unmount();
}

/**
 * The IDs of the block nodes of the fragment, from the document that the
 * binding of an editor gives for it. A block without an ID gives `null`:
 * the blocks of `yDocToBlocks` do not show that (a block without an ID gets
 * a new ID in the conversion).
 */
export function blockNodeIds(
  fragment: Y.Node,
  editor: BlockNoteEditor<any, any, any>,
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

/** Types `value` after the first occurrence of `after`, as a user of the editor. */
export function typeAfter(
  editor: BlockNoteEditor<any, any, any>,
  after: string,
  value: string,
) {
  let position: number | undefined;
  editor.prosemirrorState.doc.descendants((node, pos) => {
    const index = node.isText ? (node.text ?? "").indexOf(after) : -1;
    if (position === undefined && index !== -1) {
      position = pos + index + after.length;
    }
  });
  if (position === undefined) {
    throw new Error(`Text ${JSON.stringify(after)} not found`);
  }
  const at = position;
  editor.transact((tr) => tr.insertText(value, at));
}
