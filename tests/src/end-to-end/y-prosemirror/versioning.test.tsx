/**
 * Versioning-mode coverage for every scenario — single- AND multi-user.
 *
 * The other files in this folder exercise the SuggestionsExtension diff overlay.
 * This one exercises the OTHER diff path — `createYjsVersioningAdapter`'s
 * `enterPreview`, which reconfigures the editor through y-prosemirror
 * (`configureYProsemirror`). That path crashes for a few scenarios: moving a
 * block that carries (or dissolves) a nested blockGroup makes y-prosemirror's
 * `applyDelta` throw lib0 "Unexpected case". Each scenario is run through the
 * same shape the gallery's Versioning mode uses — every user applies their
 * change on their own clone of the base, the clones are merged via the Yjs CRDT,
 * and the merge is diffed against the base — so any scenario (single or
 * concurrent) that breaks the versioning diff is caught in CI.
 */
import { BlockNoteEditor } from "@blocknote/core";
import {
  blocksToYDoc,
  createYjsVersioningAdapter,
  withCollaboration,
} from "@blocknote/core/y";
import * as Y from "@y/y";
import { expect, test } from "vite-plus/test";

// Scenario data is shared with the suggestion-gallery example, so this covers the
// exact same cases the gallery's Versioning mode renders.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";

// Scenarios that currently crash the versioning diff. `enterPreview` ->
// y-prosemirror `applyDelta` throws lib0 "Unexpected case" when the change moves
// a block that carries (or dissolves) a nested blockGroup, or when a concurrent
// table merge feeds prosemirror-tables' fixTables a malformed table. Tracked as
// high-severity feedback in the gallery. These run as `test.fails`; when core
// fixes the bug they flip red to signal removing them from this set.
const VERSIONING_CRASHES = new Set([
  "move-paragraph-with-children",
  "nesting-unindent",
  "concurrent-table-row-vs-column",
]);

// A headless editor, used only for its (default) schema when seeding Y.Docs.
let schemaEditor: BlockNoteEditor | undefined;
const getSchema = () => (schemaEditor ??= BlockNoteEditor.create());

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

/** Clone a Y.Doc's content into a fresh doc with a pinned clientID (so the
 *  concurrent merge tiebreak — and thus the test — is deterministic). */
function cloneWithId(source: Y.Doc, clientID: number): Y.Doc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(source));
  doc.clientID = clientID;
  return doc;
}

/** Mount a collaborative editor on `doc`, returning it + a teardown. */
function mountEditor(doc: Y.Doc): {
  editor: BlockNoteEditor;
  teardown: () => void;
} {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: doc.get("doc"),
        provider: undefined,
        user: { name: "User", color: "#8a6d1a" },
      },
    }),
  );
  editor.mount(div);
  return {
    editor,
    teardown: () => {
      editor.unmount();
      div.remove();
    },
  };
}

for (const scenario of scenarios) {
  const applies =
    scenario.kind === "single"
      ? [scenario.apply]
      : [scenario.applyA, scenario.applyB];
  const runner = VERSIONING_CRASHES.has(scenario.id) ? test.fails : test;

  runner(`versioning diff: ${scenario.title}`, async () => {
    const teardown: Array<() => void> = [];
    try {
      // "Before": the scenario's initial blocks, seeded synchronously.
      const beforeDoc = blocksToYDoc(getSchema(), scenario.initial, "doc");
      beforeDoc.clientID = 1;
      teardown.push(() => beforeDoc.destroy());
      const before = Y.encodeStateAsUpdateV2(beforeDoc);

      // "After": each user applies their change on its own clone; the clones are
      // merged into `afterDoc` via the CRDT — exactly like the gallery's merge.
      const afterDoc = cloneWithId(beforeDoc, 2);
      teardown.push(() => afterDoc.destroy());

      for (let i = 0; i < applies.length; i++) {
        const userDoc = cloneWithId(beforeDoc, 3 + i);
        const { editor, teardown: unmount } = mountEditor(userDoc);
        teardown.push(() => {
          unmount();
          userDoc.destroy();
        });

        applies[i](editor);
        // Wait for the y-prosemirror binding to flush the change into `userDoc`.
        await expect
          .poll(() => !bytesEqual(Y.encodeStateAsUpdateV2(userDoc), before))
          .toBe(true);
        Y.applyUpdate(afterDoc, Y.encodeStateAsUpdate(userDoc));
      }

      const after = Y.encodeStateAsUpdateV2(afterDoc);

      // The versioning diff render — this is the path that throws for the
      // nested-move / table-merge crashers.
      const { editor: diffEditor, teardown: unmount } = mountEditor(afterDoc);
      teardown.push(unmount);
      const adapter = createYjsVersioningAdapter(
        diffEditor,
        afterDoc.get("doc"),
      );
      adapter.preview.enterPreview(after, before);

      // Reached only when enterPreview didn't throw: the diff is now showing.
      expect(diffEditor.prosemirrorState.doc.childCount).toBeGreaterThan(0);
    } finally {
      teardown.reverse().forEach((fn) => fn());
    }
  });
}
