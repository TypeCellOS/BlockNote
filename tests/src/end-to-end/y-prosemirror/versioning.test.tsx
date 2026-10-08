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
  type ExperimentalVersionDiffs,
  withCollaboration,
} from "@blocknote/core/y";
import * as Y from "@y/y";
import { expect, test } from "vite-plus/test";

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
const getSchema = () =>
  (schemaEditor ??= BlockNoteEditor.create({ schema: gallerySchema }));

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

/** Clone a Y.Doc's content into a fresh doc with a pinned clientID (so the
 *  concurrent merge tiebreak — and thus the test — is deterministic). Deleted
 *  content is kept, as stored history and the gallery keep it. */
function cloneWithId(source: Y.Doc, clientID: number): Y.Doc {
  const doc = new Y.Doc({ gc: false });
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(source));
  doc.clientID = clientID;
  return doc;
}

/** Mount a collaborative editor on `doc`, returning it + a teardown. */
function mountEditor(
  doc: Y.Doc,
  experimental: ExperimentalVersionDiffs = {},
): {
  editor: GalleryEditor;
  teardown: () => void;
} {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const editor = BlockNoteEditor.create(
    withCollaboration({
      schema: gallerySchema,
      collaboration: {
        fragment: doc.get("doc"),
        provider: undefined,
        user: { name: "User", color: "#8a6d1a" },
        experimental,
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

// Each scenario's diff with the experimental flags off (as in the editor) and
// all on.
const ALL_FIXES: ExperimentalVersionDiffs = {
  versionDiffFixes: "implicitDeleteAttributionAndRecreatedBlocks",
};
const cases = scenarios.flatMap((scenario) => [
  { scenario, name: "versioning diff", experimental: {} },
  { scenario, name: "versioning diff (experimental)", experimental: ALL_FIXES },
]);

for (const { scenario, name, experimental } of cases) {
  const applies =
    scenario.kind === "single"
      ? [scenario.apply]
      : [scenario.applyA, scenario.applyB];
  const runner = VERSIONING_CRASHES.has(scenario.id) ? test.skip : test;

  runner(`${name}: ${scenario.title}`, async () => {
    const teardown: Array<() => void> = [];
    try {
      // "Before": the scenario's initial blocks, seeded synchronously.
      const beforeDoc = blocksToYDoc(getSchema(), scenario.initial, "doc");
      beforeDoc.clientID = 1;
      teardown.push(() => beforeDoc.destroy());
      const before = Y.encodeStateAsUpdateV2(beforeDoc);

      // "After": each user applies their change on its own clone; the clones are
      // merged into `afterDoc` via the CRDT, with the gallery's merge.
      const merge = createVersionMerge(beforeDoc);
      const afterDoc = merge.doc;
      afterDoc.clientID = 2;
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
        merge.apply(Y.encodeStateAsUpdate(userDoc), ["A", "B"][i]);
      }

      const after = Y.encodeStateAsUpdateV2(afterDoc);

      // The versioning diff render — this is the path that throws for the
      // nested-move / table-merge crashers.
      const { editor: diffEditor, teardown: unmount } = mountEditor(
        afterDoc,
        experimental,
      );
      teardown.push(unmount);
      const view = createYVersionView(diffEditor, afterDoc.get("doc")).open();
      teardown.push(() => view.close());
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
          const kind = !mark.attrs["moved"]
            ? mark.type.name.replace("y-attributed-", "")
            : mark.type.name === "y-attributed-delete"
              ? "moved from"
              : "moved";
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
      const property = propertyChanges.get(scenario.id);
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
        view.close();
        expect(
          diffEditor.prosemirrorView.dom.querySelector("[data-attributes]"),
        ).toBeNull();
      }
    } finally {
      teardown.reverse().forEach((fn) => fn());
    }
  });
}
