import { afterEach, describe, expect, it } from "vite-plus/test";
import { Awareness } from "y-protocols/awareness";
import {
  absolutePositionToRelativePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import * as Y from "yjs";

import "../../style.css";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { withCollaboration, type CollaborationOptions } from "./index.js";

const REMOTE = 424242;

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * An editor with the blocks, in a host with the given style. `moveCursor`
 * puts a remote cursor at the start of a text, as a collaborator's edit does.
 */
function setup(
  blocks: PartialBlock[],
  hostStyle: string,
  showCursorLabels?: CollaborationOptions["showCursorLabels"],
) {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const awareness = new Awareness(doc);
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        provider: { awareness },
        user: { name: "Local", color: "#FF0000" },
        showCursorLabels,
      },
    }),
  );
  const host = document.createElement("div");
  host.style.cssText = hostStyle;
  document.body.append(host);
  editor.mount(host);
  cleanups.push(() => {
    editor.unmount();
    awareness.destroy();
    doc.destroy();
    host.remove();
  });
  editor.replaceBlocks(editor.document, blocks);

  const label = () =>
    host.querySelector<HTMLElement>(".bn-collaboration-cursor__label")!;
  const caret = () =>
    host.querySelector<HTMLElement>(".bn-collaboration-cursor__caret")!;

  async function moveCursor(text: string) {
    let pos = -1;
    editor.prosemirrorState.doc.descendants((node, nodePos) => {
      if (pos === -1 && node.isText && node.text!.includes(text)) {
        pos = nodePos + node.text!.indexOf(text);
      }
    });
    const { binding } = ySyncPluginKey.getState(editor.prosemirrorState);
    const relative = Y.relativePositionToJSON(
      absolutePositionToRelativePosition(pos, fragment, binding.mapping),
    );
    const added = !awareness.getStates().has(REMOTE);
    awareness.getStates().set(REMOTE, {
      user: { name: "Remote collaborator", color: "#00AA00" },
      cursor: { anchor: relative, head: relative },
    });
    // A new cursor is rendered first; a known one moves (`updated`), which
    // shows its label after 10ms.
    awareness.emit("change", [
      {
        added: added ? [REMOTE] : [],
        updated: added ? [] : [REMOTE],
        removed: [],
      },
    ]);
    await wait(50);
  }

  /**
   * Renders the remote cursor at the text, then moves it there again, so its
   * label shows as after a collaborator's edit.
   */
  async function showRemoteCursor(text: string) {
    await moveCursor(text);
    await moveCursor(text);
  }

  // The collaborator's copy of the document. One for the whole test: Yjs
  // gives a new document whose client ID is already in the content a new ID.
  const remoteDoc = new Y.Doc();
  remoteDoc.clientID = REMOTE;
  cleanups.push(() => remoteDoc.destroy());

  /** The collaborator types the text at the end of the first paragraph. */
  function typeRemotely(text: string) {
    Y.applyUpdate(
      remoteDoc,
      Y.encodeStateAsUpdate(doc, Y.encodeStateVector(remoteDoc)),
    );
    const firstText = [
      ...remoteDoc
        .getXmlFragment("doc")
        .createTreeWalker((node) => node instanceof Y.XmlText),
    ][0] as Y.XmlText;
    firstText.insert(firstText.length, text);
    Y.applyUpdate(
      doc,
      Y.encodeStateAsUpdate(remoteDoc, Y.encodeStateVector(doc)),
      "remote",
    );
  }

  return { label, caret, moveCursor, showRemoteCursor, typeRemotely };
}

/** Whether the label shows at (x, y), i.e. nothing clips it there. */
function showsAt(label: HTMLElement, x: number, y: number) {
  // The label ignores the pointer, which hit testing would skip.
  label.style.pointerEvents = "auto";
  const element = document.elementFromPoint(x, y);
  label.style.pointerEvents = "";
  return element !== null && label.contains(element);
}

/** Whether the whole label shows: it is open and nothing clips it. */
function showsWholeLabel(label: HTMLElement) {
  const rect = label.getBoundingClientRect();
  return (
    rect.width > 40 &&
    showsAt(label, rect.left + 2, rect.top + 2) &&
    showsAt(label, rect.right - 2, rect.bottom - 2)
  );
}

describe("remote cursor labels", () => {
  it("shows the whole label of a cursor in a table", async () => {
    const { label, showRemoteCursor } = setup(
      [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: ["Cell one", "Cell two"] }],
          },
        },
      ],
      "padding-top: 100px",
    );
    await showRemoteCursor("Cell one");
    await expect.poll(() => showsWholeLabel(label())).toBe(true);
  });

  it("shows the label below the caret at the top of the screen", async () => {
    const { label, caret, showRemoteCursor } = setup(
      [{ type: "paragraph", content: "First line" }],
      "position: fixed; top: 0; left: 0; width: 600px",
    );
    await showRemoteCursor("First line");
    const rect = label().getBoundingClientRect();
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(
      caret().getBoundingClientRect().bottom - 1,
    );
  });

  it("shows the label left of the caret at the right of the screen", async () => {
    const { label, caret, showRemoteCursor } = setup(
      [{ type: "paragraph", content: "Right" }],
      // The caret is about 30px from the right edge of the screen.
      "position: fixed; top: 200px; left: calc(100vw - 80px); width: 400px",
    );
    await showRemoteCursor("Right");
    const rect = label().getBoundingClientRect();
    expect(rect.right).toBeLessThanOrEqual(innerWidth);
    expect(rect.right).toBeLessThanOrEqual(
      caret().getBoundingClientRect().right + 1,
    );
  });

  it("shows the label while the collaborator types, until they stop", async () => {
    const { label, moveCursor, typeRemotely } = setup(
      [{ type: "paragraph", content: "Some text" }],
      "padding-top: 100px",
    );
    // Only renders the cursor: its label is closed.
    await moveCursor("Some text");
    expect(showsWholeLabel(label())).toBe(false);
    // Typing doesn't move a cursor in Yjs (it is relative to the text), so
    // only the edits tell that the collaborator is active.
    typeRemotely("a");
    await expect.poll(() => showsWholeLabel(label())).toBe(true);
    await wait(1500);
    typeRemotely("b");
    await wait(1500);
    // 3 seconds after the first edit, but 1.5 after the last one.
    expect(showsWholeLabel(label())).toBe(true);
    await expect
      .poll(() => showsWholeLabel(label()), { timeout: 3000 })
      .toBe(false);
  });

  it("closes the label into the caret after it moved away from the right edge", async () => {
    const { label, moveCursor, showRemoteCursor } = setup(
      [{ type: "paragraph", content: "One two three four five six" }],
      // The end of the text is near the right edge of the screen.
      "position: fixed; top: 200px; left: calc(100vw - 260px); width: 400px",
    );
    await showRemoteCursor("six");
    await expect
      .poll(() => label().getAttribute("data-placement"))
      .toBe("top-end");
    // Moving left, as with the arrow keys: away from the edge.
    for (const word of ["five", "four", "three", "two", "One"]) {
      await moveCursor(word);
    }
    await expect
      .poll(() => showsWholeLabel(label()), { timeout: 3000 })
      .toBe(false);
    // It closed into its corner at the caret: the label is to its right.
    expect(label().getAttribute("data-placement")).toBe("top-start");
  });

  it("closes the label 2 seconds after the cursor's activity", async () => {
    const { label, showRemoteCursor } = setup(
      [{ type: "paragraph", content: "Some text" }],
      "padding-top: 100px",
    );
    await showRemoteCursor("Some text");
    await expect.poll(() => showsWholeLabel(label())).toBe(true);
    await expect
      .poll(() => showsWholeLabel(label()), { timeout: 3000 })
      .toBe(false);
  });
});

describe('remote cursor labels with showCursorLabels: "always"', () => {
  it("shows the label of a cursor without activity", async () => {
    const { label, moveCursor } = setup(
      [{ type: "paragraph", content: "Some text" }],
      "padding-top: 100px",
      "always",
    );
    // Only renders the cursor: no edit shows its label.
    await moveCursor("Some text");
    await expect.poll(() => showsWholeLabel(label())).toBe(true);
  });

  it("keeps the label open after the cursor's activity", async () => {
    const { label, showRemoteCursor } = setup(
      [{ type: "paragraph", content: "Some text" }],
      "padding-top: 100px",
      "always",
    );
    await showRemoteCursor("Some text");
    await wait(2100);
    await expect.poll(() => showsWholeLabel(label())).toBe(true);
  });

  it("shows the label below the caret when the cursor moves to the top of the screen", async () => {
    const { label, caret, moveCursor } = setup(
      [
        { type: "paragraph", content: "First line" },
        { type: "paragraph", content: "Second line" },
      ],
      "position: fixed; top: 0; left: 0; width: 600px",
      "always",
    );
    await moveCursor("Second line");
    await moveCursor("First line");
    await expect
      .poll(() => label().getBoundingClientRect().top)
      .toBeGreaterThanOrEqual(caret().getBoundingClientRect().bottom - 1);
    // The label opens from the caret's side, with its square corner there
    // (see `editor.css`). Firefox reports a stale computed style for an
    // element in a fallback position, so this reads the side instead.
    await expect
      .poll(() => label().getAttribute("data-placement"))
      .toBe("bottom-start");
  });
});
