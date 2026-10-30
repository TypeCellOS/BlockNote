import { Awareness } from "@y/protocols/awareness";
import { resolvedPositionToRelativePosition } from "@y/prosemirror";
import * as Y from "@y/y";
import { afterEach, describe, expect, it } from "vite-plus/test";

import "../../style.css";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration, type CollaborationOptions } from "./index.js";

const REMOTE = 424242;

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

/** A collaborative editor, mounted in the page. */
function createEditor(
  doc: Y.Doc,
  awareness: Awareness,
  showCursorLabels?: CollaborationOptions["showCursorLabels"],
) {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: doc.get("doc"),
        provider: { awareness },
        user: { name: "Local", color: "#FF0000" },
        showCursorLabels,
      },
    }),
  );
  const host = document.createElement("div");
  host.style.cssText = "padding-top: 100px";
  document.body.append(host);
  editor.mount(host);
  cleanups.push(() => {
    editor.unmount();
    host.remove();
  });
  return { editor, host };
}

/**
 * An editor with a paragraph, and a collaborator with a cursor at the start
 * of the text. The collaborator types in their own editor.
 */
async function setup(
  showCursorLabels?: CollaborationOptions["showCursorLabels"],
) {
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  cleanups.push(() => {
    awareness.destroy();
    doc.destroy();
  });
  const { editor, host } = createEditor(doc, awareness, showCursorLabels);
  editor.replaceBlocks(editor.document, [
    { type: "paragraph", content: "Some text" },
  ]);

  // The collaborator's copy of the document and editor.
  const remoteDoc = new Y.Doc();
  remoteDoc.clientID = REMOTE;
  const remoteAwareness = new Awareness(remoteDoc);
  cleanups.push(() => {
    remoteAwareness.destroy();
    remoteDoc.destroy();
  });
  Y.applyUpdate(remoteDoc, Y.encodeStateAsUpdate(doc));
  const { editor: remoteEditor } = createEditor(remoteDoc, remoteAwareness);

  const label = () =>
    host.querySelector<HTMLElement>(".bn-collaboration-cursor__label")!;

  /** Moves the collaborator's cursor to the start of the text. */
  async function moveCursor() {
    const view = editor.prosemirrorView;
    let pos = -1;
    view.state.doc.descendants((node, nodePos) => {
      if (pos === -1 && node.isText) {
        pos = nodePos;
      }
    });
    const relative = Y.relativePositionToJSON(
      resolvedPositionToRelativePosition(view, view.state.doc.resolve(pos))!,
    );
    const added = !awareness.getStates().has(REMOTE);
    awareness.getStates().set(REMOTE, {
      user: { name: "Remote collaborator", color: "#00AA00" },
      cursor: { anchor: relative, head: relative },
    });
    awareness.emit("change", [
      {
        added: added ? [REMOTE] : [],
        updated: added ? [] : [REMOTE],
        removed: [],
      },
      "remote",
    ]);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  /** The collaborator types the text at the end of their paragraph. */
  function typeRemotely(text: string) {
    const block = remoteEditor.document[0];
    remoteEditor.setTextCursorPosition(block, "end");
    remoteEditor.insertInlineContent(text);
    Y.applyUpdate(
      doc,
      Y.encodeStateAsUpdate(remoteDoc, Y.encodeStateVector(doc)),
      "remote",
    );
  }

  return { label, moveCursor, typeRemotely };
}

/** Whether the label is open: its cursor is active, and nothing clips it. */
function isOpen(label: HTMLElement) {
  if (!label.closest("[data-active]")) {
    return false;
  }
  const rect = label.getBoundingClientRect();
  // The label ignores the pointer, which hit testing would skip.
  label.style.pointerEvents = "auto";
  const element = document.elementFromPoint(rect.right - 2, rect.top + 2);
  label.style.pointerEvents = "";
  return element !== null && label.contains(element);
}

/** The number of listeners to an event of a Yjs observable. */
function listeners(
  observable: { _observers: Map<string, Set<unknown>> },
  event: string,
) {
  return observable._observers.get(event)?.size ?? 0;
}

describe("remote cursor labels (Yjs 14)", () => {
  it("shows the label when the cursor moves, and closes it 2 seconds later", async () => {
    const { label, moveCursor } = await setup();
    await moveCursor();
    expect(isOpen(label())).toBe(false);
    await moveCursor();
    await expect.poll(() => isOpen(label())).toBe(true);
    await expect.poll(() => isOpen(label()), { timeout: 3000 }).toBe(false);
  });

  it("shows the label while the collaborator types", async () => {
    const { label, moveCursor, typeRemotely } = await setup();
    await moveCursor();
    expect(isOpen(label())).toBe(false);
    typeRemotely("a");
    await expect.poll(() => isOpen(label())).toBe(true);
  });

  it('shows the label without activity with showCursorLabels: "always"', async () => {
    const { label, moveCursor } = await setup("always");
    await moveCursor();
    await expect.poll(() => isOpen(label())).toBe(true);
  });

  it("removes its listeners when the editor unmounts", () => {
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    cleanups.push(() => {
      awareness.destroy();
      doc.destroy();
    });
    const editor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: doc.get("doc"),
          provider: { awareness },
          user: { name: "Local", color: "#FF0000" },
        },
      }),
    );
    const before = {
      change: listeners(awareness, "change"),
      afterTransaction: listeners(doc, "afterTransaction"),
    };
    const host = document.createElement("div");
    document.body.append(host);
    cleanups.push(() => host.remove());
    editor.mount(host);
    // The cursors follow awareness changes and edits of collaborators.
    expect(listeners(awareness, "change")).toBeGreaterThan(before.change);
    expect(listeners(doc, "afterTransaction")).toBeGreaterThan(
      before.afterTransaction,
    );

    editor.unmount();
    expect(listeners(awareness, "change")).toBe(before.change);
    expect(listeners(doc, "afterTransaction")).toBe(before.afterTransaction);
  });
});
