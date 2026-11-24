/**
 * Versioning-mode coverage for every scenario — single- AND multi-user.
 *
 * The other files in this folder exercise the SuggestionsExtension diff overlay.
 * This one exercises the collaborative diff path through `createYVersionView`.
 * Its owned view renders a static document while synchronization is
 * paused. The old binding-based renderer crashed for a few scenarios: moving
 * a block that carries (or dissolves) a nested blockGroup made y-prosemirror's
 * `applyDelta` throw lib0 "Unexpected case". Each scenario is run through the
 * same shape the gallery's Versioning mode uses — every user applies their
 * change on their own clone of the base, the clones are merged via the Yjs CRDT,
 * and the merge is diffed against the base — so any scenario (single or
 * concurrent) that breaks the versioning diff is caught in CI.
 */
import { BlockNoteEditor } from "@blocknote/core";
import {
  blocksToYDoc,
  getAttributeChanges,
  createYVersionView,
  withCollaboration,
} from "@blocknote/core/y";
import * as Y from "@y/y";
import { afterAll, expect, onTestFinished, test } from "vite-plus/test";

// Scenario data is shared with the suggestion-gallery example, so this covers the
// exact same cases the gallery's Versioning mode renders.
import { scenarios } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarios";
import {
  gallerySchema,
  type GalleryEditor,
} from "@examples/07-collaboration/14-suggestion-gallery/src/gallerySchema";
import { createVersionMerge } from "@examples/07-collaboration/14-suggestion-gallery/src/scenarioDocs";

// A headless editor, used only for its schema (the gallery schema — default blocks
// plus page break + multi-column) when seeding Y.Docs.
let schemaEditor: GalleryEditor | undefined;
function getSchema() {
  return (schemaEditor ??= BlockNoteEditor.create({ schema: gallerySchema }));
}

afterAll(() => {
  const editor = schemaEditor;
  schemaEditor = undefined;
  editor?._tiptapEditor.destroy();
});

/** Clone a Y.Doc's content into a fresh doc with a pinned clientID (so the
 *  concurrent merge tiebreak — and thus the test — is deterministic). Deleted
 *  content is kept, as stored history and the gallery keep it. */
function cloneWithId(source: Y.Doc, clientID: number): Y.Doc {
  const doc = new Y.Doc({ gc: false });
  onTestFinished(() => doc.destroy());
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(source));
  doc.clientID = clientID;
  return doc;
}

/** Mount a collaborative editor after its doc's disposal has been registered. */
function mountEditor(doc: Y.Doc): GalleryEditor {
  const div = document.createElement("div");
  onTestFinished(() => div.remove());
  document.body.appendChild(div);
  const editor = BlockNoteEditor.create(
    withCollaboration({
      schema: gallerySchema,
      collaboration: {
        fragment: doc.get("doc"),
        provider: undefined,
        user: { name: "User", color: "#8a6d1a" },
      },
    }),
  );
  onTestFinished(() => editor._tiptapEditor.destroy());
  editor.mount(div);
  return editor;
}

// Scenarios that currently crash the versioning diff and are skipped until
// fixed. `large-diff-delete-all` replaceBlocks-traverses a bound
// `blockContainer` that has no `id` attr, so `getNodeId` throws
// ("Node blockContainer does not have an ID"). We `test.skip` rather than
// `test.fails` because as of @y/prosemirror v2.0.0-6 the throw is caught and
// retried into a runaway warning loop that never lets the suite finish.
const VERSIONING_CRASHES = new Set<string>(["large-diff-delete-all"]);

const propertyChanges = new Map([
  ["prop-text-alignment", "textAlignment"],
  ["prop-heading-level", "level"],
  ["prop-image-width", "previewWidth"],
  ["prop-image-source", "url"],
]);

for (const scenario of scenarios) {
  const applies =
    scenario.kind === "single"
      ? [scenario.apply]
      : [scenario.applyA, scenario.applyB];
  const runner = VERSIONING_CRASHES.has(scenario.id) ? test.skip : test;

  runner(`versioning diff: ${scenario.title}`, () => {
    // "Before": the scenario's initial blocks, seeded synchronously.
    const beforeDoc = blocksToYDoc(getSchema(), scenario.initial, "doc");
    onTestFinished(() => beforeDoc.destroy());
    beforeDoc.clientID = 1;
    const before = Y.encodeStateAsUpdateV2(beforeDoc);

    // "After": each user applies their change on its own clone; the clones are
    // merged into `afterDoc` via the CRDT, with the gallery's merge.
    const merge = createVersionMerge(beforeDoc);
    const afterDoc = merge.doc;
    onTestFinished(() => afterDoc.destroy());
    afterDoc.clientID = 2;

    for (let i = 0; i < applies.length; i++) {
      const userDoc = cloneWithId(beforeDoc, 3 + i);
      const editor = mountEditor(userDoc);

      let wroteToY = false;
      function onTransaction(transaction: Y.Transaction) {
        if (
          transaction.local &&
          (!transaction.insertSet.isEmpty() || !transaction.deleteSet.isEmpty())
        ) {
          wroteToY = true;
        }
      }
      userDoc.on("afterTransactionCleanup", onTransaction);
      try {
        applies[i](editor);
      } finally {
        userDoc.off("afterTransactionCleanup", onTransaction);
      }
      // Each scenario callback dispatches synchronously, and y-prosemirror
      // writes in the view's update hook. Merge only once the whole callback
      // has returned, not on the first Y transaction of a multi-step edit.
      expect(wroteToY).toBe(true);
      merge.apply(Y.encodeStateAsUpdate(userDoc), ["A", "B"][i]);
    }

    const after = Y.encodeStateAsUpdateV2(afterDoc);

    // The versioning diff render — this is the path that throws for the
    // nested-move / table-merge crashers.
    const diffEditor = mountEditor(afterDoc);
    const view = createYVersionView(diffEditor, afterDoc.get("doc")).open();
    const property = propertyChanges.get(scenario.id);
    try {
      view.show({
        content: after,
        comparison: { content: before, attributions: merge.attributions },
        target: { type: "current" },
      });

      // Reached only when show didn't throw: the diff is now showing.
      expect(diffEditor.prosemirrorState.doc.childCount).toBeGreaterThan(0);

      // Every change with its authors, e.g. `delete block "Parent" A`. A block
      // is named by its text; an inserted or deleted node's attributes are
      // implied, so only attribute changes on kept nodes are listed.
      const changes: string[] = [];
      diffEditor.prosemirrorState.doc.descendants((node) => {
        const marks = node.marks.filter((mark) =>
          mark.type.name.startsWith("y-attributed-"),
        );
        const replaced = marks.some((mark) =>
          ["y-attributed-insert", "y-attributed-delete"].includes(
            mark.type.name,
          ),
        );
        const what = node.isText
          ? JSON.stringify(node.text)
          : node.type.name === "blockContainer"
            ? `block ${JSON.stringify(node.firstChild?.textContent ?? "")}`
            : `<${node.type.name}>`;
        for (const mark of marks) {
          const kind = mark.type.name.replace("y-attributed-", "");
          if (kind === "attrs" && replaced) {
            continue;
          }
          const users =
            kind === "attrs"
              ? Object.entries(getAttributeChanges(mark))
                  .map(([key, change]) => `${key}:${change.userIds.join(",")}`)
                  .join(" ")
              : (mark.attrs["userIds"] ?? []).join(",");
          changes.push(`${kind} ${what} ${users}`.trimEnd());
        }
      });
      expect(changes).toMatchSnapshot();
      if (property) {
        const changedProperties: string[] = [];
        diffEditor.prosemirrorState.doc.descendants((node) => {
          for (const mark of node.marks) {
            if (mark.type.name === "y-attributed-attrs") {
              changedProperties.push(...Object.keys(getAttributeChanges(mark)));
            }
          }
        });
        expect(changedProperties).toEqual([property]);
      }
    } finally {
      // Close the preview before the finish hooks release its editor and doc.
      view.close();
    }
    if (property) {
      expect(
        diffEditor.domElement?.querySelector("[data-attributes]"),
      ).toBeNull();
    }
  });
}
