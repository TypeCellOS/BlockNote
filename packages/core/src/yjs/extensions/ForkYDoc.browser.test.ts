import { describe, expect, type TestContext } from "vite-plus/test";
import { Awareness } from "y-protocols/awareness";
import { ySyncPluginKey } from "y-prosemirror";
import * as Y from "yjs";

import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { withCollaboration } from "./index.js";

async function setup(
  setupEditor: SetupEditor,
  onTestFinished: TestContext["onTestFinished"],
) {
  const doc = new Y.Doc();
  onTestFinished(() => doc.destroy());
  const fragment = doc.getXmlFragment("doc");
  // Awareness binds its destroy handler to the doc and clears its interval there.
  const awareness = new Awareness(doc);
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: {
        fragment,
        provider: { awareness },
        user: { name: "Test User", color: "#FF0000" },
      },
    }),
  });
  const fork = editor.getExtension(ForkYDocExtension)!;
  onTestFinished(() => fork.merge({ keepChanges: false }));
  return { editor, doc, fragment, awareness };
}

function setText(editor: BlockNoteEditor, content: string) {
  editor.replaceBlocks(editor.document, [{ type: "paragraph", content }]);
}

// Ported from PR #3136. Real views are required to observe the synchronous
// y-prosemirror render and remote cursor initialization during replacement.
describe("fork/merge plugin state (#3135)", () => {
  it.for([false, true])(
    "restores remote cursors with a consistent binding (keepChanges: %s)",
    async (keepChanges, { setupEditor, onTestFinished }) => {
      const ctx = await setup(setupEditor, onTestFinished);
      ctx.editor.replaceBlocks(ctx.editor.document, [
        { type: "paragraph", content: "one" },
        { type: "paragraph", content: "two" },
      ]);
      const cursor = Y.relativePositionToJSON(
        Y.createRelativePositionFromTypeIndex(
          ctx.fragment,
          ctx.fragment.length,
        ),
      );
      ctx.awareness.getStates().set(424242, {
        user: { name: "Remote", color: "#00FF00" },
        cursor: { anchor: cursor, head: cursor },
      });
      const fork = ctx.editor.getExtension(ForkYDocExtension)!;
      fork.fork();
      setText(ctx.editor, "Forked edit");
      expect(() => fork.merge({ keepChanges })).not.toThrow();
      expect(fork.store.state.isForked).toBe(false);
      const text = ctx.editor.document
        .flatMap(({ content }) => (Array.isArray(content) ? content : []))
        .map((inline) => (inline.type === "text" ? inline.text : ""))
        .join("");
      expect(text).toBe(keepChanges ? "Forked edit" : "onetwo");
      const sync = ySyncPluginKey.getState(ctx.editor.prosemirrorState);
      expect(sync.type).toBe(ctx.fragment);
      expect(sync.doc).toBe(ctx.doc);
      expect(sync.binding.type).toBe(ctx.fragment);
      expect(
        ctx.editor.domElement!.querySelector(".bn-collaboration-cursor__base"),
      ).not.toBeNull();
    },
  );
});
