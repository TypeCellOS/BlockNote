import { afterEach, expect, it } from "vite-plus/test";
import { Awareness } from "y-protocols/awareness";
import {
  absolutePositionToRelativePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import * as Y from "yjs";

import "../../style.css";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration } from "../../yjs/extensions/index.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

it("keeps the empty-document placeholder visible with a remote cursor (#2118)", async () => {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("document");
  const awareness = new Awareness(doc);
  const editor = BlockNoteEditor.create(
    withCollaboration({
      placeholders: { emptyDocument: "Empty document", default: "Empty block" },
      collaboration: {
        fragment,
        provider: { awareness },
        user: { name: "Local", color: "#0000ff" },
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
  // Commit the initial paragraph to Yjs before publishing a remote position.
  editor.replaceBlocks(editor.document, [{ type: "paragraph", content: [] }]);
  const block = host.querySelector(".bn-block-content")!;
  function placeholder() {
    const style = getComputedStyle(
      host.querySelector(".bn-block-content")!,
      "::after",
    );
    return {
      content: style.content,
      fontStyle: style.fontStyle,
      marginInlineStart: style.marginInlineStart,
      pointerEvents: style.pointerEvents,
      maxWidth: style.maxWidth,
    };
  }
  const before = placeholder();
  expect(before).toEqual({
    content: '"Empty document"',
    fontStyle: "italic",
    marginInlineStart: "-2px",
    pointerEvents: "none",
    maxWidth: "100%",
  });
  const state = editor.prosemirrorState;
  const sync = ySyncPluginKey.getState(state);
  const cursor = absolutePositionToRelativePosition(
    state.selection.from,
    fragment,
    sync.binding.mapping,
  );
  const remoteID = awareness.clientID + 1;
  awareness.getStates().set(remoteID, {
    user: { name: "Remote", color: "#ff0000" },
    cursor: { anchor: cursor, head: cursor },
  });
  awareness.emit("change", [
    { added: [remoteID], updated: [], removed: [] },
    "test",
  ]);
  await expect
    .poll(() => block.querySelector(".bn-collaboration-cursor__base"))
    .not.toBeNull();
  expect(editor.prosemirrorState.doc.textContent).toBe("");
  expect(placeholder()).toEqual(before);

  editor.updateBlock(editor.document[0], { content: "Typed text" });
  await expect.poll(() => placeholder().content).toBe("none");
});
