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
    function snapshot(content: string) {
      editor.replaceBlocks(editor.document, [{ type: "paragraph", content }]);
      prosemirrorToYXmlFragment(
        editor.transact(({ doc }) => doc),
        legacyFragment,
      );
      return Y1.encodeStateAsUpdateV2(legacyDoc);
    }
    return { baseline: snapshot("Version 1"), snapshot: snapshot("Version 2") };
  } finally {
    legacyDoc.destroy();
  }
}
