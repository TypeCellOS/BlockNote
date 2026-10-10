/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vite-plus/test";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { CollaborationExtension } from "./index.js";

describe("CollaborationExtension", () => {
  it("syncs edits when registered on an existing editor", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    const editor = BlockNoteEditor.create({
      disableExtensions: ["history"],
      initialContent: [{ type: "paragraph", id: "initialBlockId" }],
    });
    editor.mount(document.createElement("div"));

    editor.registerExtension(
      CollaborationExtension({
        fragment,
        user: { name: "Test User", color: "#FF0000" },
        provider: { awareness: new Awareness(doc) },
      }),
    );
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "hello" },
    ]);

    expect(fragment.toJSON()).toContain("hello");

    editor.unmount();
    doc.destroy();
  });
});
