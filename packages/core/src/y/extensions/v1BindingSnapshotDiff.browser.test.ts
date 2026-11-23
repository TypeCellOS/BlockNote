import { describe, expect } from "vite-plus/test";
import * as Y from "@y/y";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration } from "./index.js";
import { showSnapshotPreview } from "./snapshotPreview.js";
import { buildV1Snapshots } from "./v1BindingSnapshotDiff.fixture.js";

function attributionMarkNames(editor: BlockNoteEditor): Set<string> {
  const names = new Set<string>();
  editor
    .transact(({ doc }) => doc)
    .descendants((node) => {
      node.marks.forEach((m) => {
        if (m.type.name.startsWith("y-attributed-")) {
          names.add(m.type.name);
        }
      });
      return true;
    });
  return names;
}

describe("v1 binding snapshot diff", () => {
  it("diffs two v1-shaped snapshots through the new binding", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const fragment = doc.get("doc");
    const { editor } = await setupEditor({
      mountType: "dom",
      ...withCollaboration({
        extensions: [],
        collaboration: {
          fragment,
          user: { name: "Preview Test", color: "#0000ff" },
          provider: undefined,
        },
      }),
    });
    const { baseline, snapshot } = buildV1Snapshots(editor);

    showSnapshotPreview(editor, fragment, snapshot, baseline);

    const names = attributionMarkNames(editor);
    expect(names.has("y-attributed-insert")).toBe(true);
    expect(names.has("y-attributed-delete")).toBe(true);
    // The diff renders deleted text inline alongside inserted text: the deleted
    // "1" and the inserted "2" both appear, each with its attribution mark.
    expect(editor.transact(({ doc }) => doc.textContent)).toBe("Version 12");
  });
});
