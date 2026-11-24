import * as Y from "@y/y";
import { describe, expect } from "vite-plus/test";
import { decodeFragmentUpdate } from "./snapshotCodec.js";
import { buildV1Snapshots } from "./v1BindingSnapshotDiff.fixture.js";

describe("v1 binding snapshot diff", () => {
  it("decodes a v1-shaped update into the nested anonymous node layout", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const { baseline } = buildV1Snapshots(editor);

    const decoded = decodeFragmentUpdate(doc.get("doc"), baseline);
    try {
      const tree = JSON.stringify(decoded.fragment.toDelta());
      expect(tree).toContain('"name":"blockGroup"');
      expect(tree).toContain('"name":"paragraph"');
      expect(tree).not.toContain('"name":null');
      expect(tree).toMatch(
        /"paragraph","children":\[\{"children":\["Version 1"\]/,
      );
    } finally {
      decoded.doc.destroy();
    }
  });
});
