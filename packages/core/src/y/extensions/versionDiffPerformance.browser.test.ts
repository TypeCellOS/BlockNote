import * as Y from "@y/y";
import { Plugin } from "prosemirror-state";
import { describe, expect } from "vite-plus/test";

import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import {
  createExtension,
  type ExtensionFactoryInstance,
} from "../../editor/BlockNoteExtension.js";
import { blocksToYType } from "../utils.js";
import { withCollaboration } from "./index.js";
import { createYVersionView } from "./Versioning.js";

async function collaborativeEditor(
  setupEditor: SetupEditor,
  doc: Y.Doc,
  extensions: ExtensionFactoryInstance[] = [],
) {
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions,
      collaboration: {
        fragment: doc.get("doc"),
        user: { name: "Test", color: "#ff0000" },
      },
    }),
  });
  return editor;
}

/** Records the step count of every document change. */
function recordSteps(steps: number[]): ExtensionFactoryInstance {
  return createExtension({
    key: "recordDiffSteps",
    prosemirrorPlugins: [
      new Plugin({
        filterTransaction(tr) {
          if (tr.docChanged) {
            steps.push(tr.steps.length);
          }
          return true;
        },
      }),
    ],
  });
}

describe("Version diff performance", () => {
  // The binding renders a diff as one transaction, with a step per change.
  // Plugins then handle it once, without replaying its steps
  // (`combineTransactionSteps`), so a large diff stays fast.
  it("shows a version in one transaction", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const blockCount = 40;
    const doc = new Y.Doc({ gc: false });
    // Finish hooks unwind in reverse order, so mounted fixtures dispose their
    // editors and hosts before the corresponding Y.Docs are destroyed.
    onTestFinished(() => doc.destroy());
    const { editor: seed } = await setupEditor({
      mountType: false,
      initialContent: Array.from({ length: blockCount }, (_, i) => ({
        id: `b${i}`,
        type: "paragraph" as const,
        content: `Block ${i}`,
      })),
    });
    blocksToYType(seed, seed.document, doc.get("doc"));
    const before = Y.encodeStateAsUpdateV2(doc);

    // Indenting re-creates a block, so every other block is shown twice:
    // deleted at its old place and inserted at its new place.
    const user = await collaborativeEditor(setupEditor, doc);
    for (let i = 1; i < blockCount; i += 2) {
      user.setTextCursorPosition(`b${i}`);
      user.nestBlock();
    }
    const after = Y.encodeStateAsUpdateV2(doc);

    const viewDoc = new Y.Doc();
    onTestFinished(() => viewDoc.destroy());
    Y.applyUpdateV2(viewDoc, after);
    const steps: number[] = [];
    const editor = await collaborativeEditor(setupEditor, viewDoc, [
      recordSteps(steps),
    ]);
    steps.length = 0; // Ignore transactions needed to hydrate the initial view.
    const view = createYVersionView(editor, viewDoc.get("doc")).open();
    onTestFinished(() => view.close());
    view.show({
      content: after,
      comparison: { content: before },
      target: { type: "snapshot", id: "after" },
    });

    expect(steps).toHaveLength(1);
    expect(steps[0]).toBeGreaterThan(1);
  });
});
