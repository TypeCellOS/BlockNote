/**
 * @vitest-environment jsdom
 */
import * as Y from "@y/y";
import { Plugin } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYType } from "../utils.js";
import { withCollaboration } from "./index.js";
import { createYVersionView } from "./Versioning.js";

type Editor = BlockNoteEditor<any, any, any>;

const editors: Editor[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.unmount();
  }
});

function collaborativeEditor(doc: Y.Doc): Editor {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: doc.get("doc"),
        user: { name: "Test", color: "#ff0000" },
      },
    }),
  );
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor.mount(element);
  editors.push(editor);
  return editor;
}

/** Records the step count of every document change `editor` dispatches. */
function recordSteps(editor: Editor): number[] {
  const steps: number[] = [];
  editor.prosemirrorView!.updateState(
    editor.prosemirrorState.reconfigure({
      plugins: [
        ...editor.prosemirrorState.plugins,
        new Plugin({
          filterTransaction(tr) {
            if (tr.docChanged) {
              steps.push(tr.steps.length);
            }
            return true;
          },
        }),
      ],
    }),
  );
  return steps;
}

describe("Version diff performance", () => {
  // Plugins that map through every step (UniqueID, autolink, attributions)
  // take quadratic time, so a diff of thousands of blocks took seconds.
  it.fails("shows a version in one step", () => {
    // Fails: the binding renders the diff as one step per change.
    const blockCount = 300;
    const doc = new Y.Doc({ gc: false });
    const seed = BlockNoteEditor.create();
    seed.replaceBlocks(
      seed.document,
      Array.from({ length: blockCount }, (_, i) => ({
        id: `b${i}`,
        type: "paragraph" as const,
        content: `Block ${i}`,
      })),
    );
    blocksToYType(seed, seed.document, doc.get("doc"));
    const before = Y.encodeStateAsUpdateV2(doc);

    // Indenting re-creates a block, so every other block is shown twice:
    // deleted at its old place and inserted at its new place.
    const user = collaborativeEditor(doc);
    for (let i = 1; i < blockCount; i += 2) {
      user.setTextCursorPosition(`b${i}`);
      user.nestBlock();
    }
    const after = Y.encodeStateAsUpdateV2(doc);

    const viewDoc = new Y.Doc();
    Y.applyUpdateV2(viewDoc, after);
    const editor = collaborativeEditor(viewDoc);
    const steps = recordSteps(editor);
    createYVersionView(editor, viewDoc.get("doc"))
      .open()
      .show({
        content: after,
        comparison: { content: before },
        target: { type: "snapshot", id: "after" },
      });

    expect(steps).toEqual([1]);
  });
});
