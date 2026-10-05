import { afterEach, describe, expect, it } from "vite-plus/test";
import { Awareness } from "y-protocols/awareness";
import { ySyncPluginKey } from "y-prosemirror";
import * as Y from "yjs";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { withCollaboration } from "./index.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

function setup() {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const awareness = new Awareness(doc);
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        provider: { awareness },
        user: { name: "Test User", color: "#FF0000" },
      },
    }),
  );
  const host = document.createElement("div");
  document.body.append(host);
  editor.mount(host);
  cleanups.push(() => {
    editor.unmount();
    awareness.destroy();
    doc.destroy();
    host.remove();
  });
  return { editor, doc, fragment, awareness, host };
}

function setText(editor: BlockNoteEditor, content: string) {
  editor.replaceBlocks(editor.document, [{ type: "paragraph", content }]);
}

// Ported from PR #3136. Real views are required to observe the synchronous
// y-prosemirror render and remote cursor initialization during replacement.
describe("fork/merge plugin state (#3135)", () => {
  it.each([false, true])(
    "restores remote cursors with a consistent binding (keepChanges: %s)",
    (keepChanges) => {
      const ctx = setup();
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
      expect(ctx.editor.prosemirrorState.doc.textContent).toBe(
        keepChanges ? "Forked edit" : "onetwo",
      );
      const sync = ySyncPluginKey.getState(ctx.editor.prosemirrorState);
      expect(sync.type).toBe(ctx.fragment);
      expect(sync.doc).toBe(ctx.doc);
      expect(sync.binding.type).toBe(ctx.fragment);
      expect(
        ctx.host.querySelector(".bn-collaboration-cursor__base"),
      ).not.toBeNull();
    },
  );
});
