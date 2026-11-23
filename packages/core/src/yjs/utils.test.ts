import * as Y from "yjs";
import { registerRoundTripUtilsTests } from "./roundTripUtils.test.cases.js";
import {
  _blocksToProsemirrorNode,
  blocksToYDoc,
  blocksToYXmlFragment,
  yDocToBlocks,
  yXmlFragmentToBlocks,
} from "./utils.js";

registerRoundTripUtilsTests({
  name: "Test yjs utils",
  javascriptSample: "console.log('Hello, world!');",
  blocksToProseMirror: _blocksToProsemirrorNode,
  roundTripDocument(editor, blocks) {
    const doc = blocksToYDoc(editor, blocks);
    try {
      return yDocToBlocks(editor, doc);
    } finally {
      doc.destroy();
    }
  },
  roundTripFragment(editor, blocks) {
    const doc = new Y.Doc();
    try {
      const fragment = doc.getXmlFragment("test");
      blocksToYXmlFragment(editor, blocks, fragment);
      return yXmlFragmentToBlocks(editor, fragment);
    } finally {
      doc.destroy();
    }
  },
});
