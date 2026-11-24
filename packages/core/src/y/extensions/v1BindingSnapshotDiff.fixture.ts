import * as Y1 from "yjs";
import { prosemirrorToYXmlFragment } from "y-prosemirror";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

/**
 * Writes two ProseMirror states into one Yjs v13 document. Reusing the
 * document keeps both snapshots in the same ID space for the version diff.
 */
export function buildV1Snapshots(editor: BlockNoteEditor) {
  const legacyDoc = new Y1.Doc();
  try {
    const legacyFragment = legacyDoc.getXmlFragment("doc");
    function snapshot() {
      prosemirrorToYXmlFragment(
        editor.transact(({ doc }) => doc),
        legacyFragment,
      );
      return Y1.encodeStateAsUpdateV2(legacyDoc);
    }
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Version 1" },
    ]);
    const baseline = snapshot();
    // An edit of the block: it keeps its block ID. A block with a different ID
    // is a different block for the diff (see blockMatchNodes.ts).
    editor.updateBlock(editor.document[0].id, { content: "Version 2" });
    return { baseline, snapshot: snapshot() };
  } finally {
    legacyDoc.destroy();
  }
}
