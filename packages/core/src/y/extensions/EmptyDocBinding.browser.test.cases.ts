/**
 * Repro for the gallery's "insert image / add heading shows 2 blocks" bug.
 *
 * Mounting a collaborative editor on a clone of an EMPTY Y.Doc auto-creates a
 * paragraph. That paragraph should carry the stable `initialBlockId` (the id
 * `withCollaboration` seeds via `initialContent`), so every clone agrees on
 * the same block identity. If each mount instead mints a RANDOM id, then
 * `replaceBlocks([autoPara] → [newBlock])` + a CRDT merge keeps BOTH the
 * phantom paragraph and the new block — and their order flips with the Yjs
 * clientID tiebreak.
 *
 * Desired behavior is asserted below; failures demonstrate the bug.
 *
 * Also covers the multi-peer shape: several clients mounting on one shared,
 * initially EMPTY Y.Doc must keep their skeletons out of Y until real content
 * appears, so the first edit seeds the single shared root instead of racing
 * competing roots — and late joiners render whatever is shared without
 * leaving phantoms.
 */
import { ySyncPluginKey } from "@y/prosemirror";
import * as Y from "@y/y";
import { beforeEach, describe, expect } from "vite-plus/test";

import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYDoc, yDocToBlocks } from "../utils.js";
import { withCollaboration } from "./index.js";

const cleanups: Array<() => void> = [];

function cloneDoc(source: Y.Doc): Y.Doc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(source));
  cleanups.push(() => doc.destroy());
  return doc;
}

function sortedIds(schemaEditor: BlockNoteEditor, doc: Y.Doc): string[] {
  return yDocToBlocks(schemaEditor, doc, "doc")
    .map((b) => b.id)
    .sort();
}

async function mountCollab(setupEditor: SetupEditor, fragment: Y.Node) {
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: {
        fragment,
        provider: undefined,
        user: { name: "Test User", color: "#FF0000" },
      },
    }),
  });
  // Binding and its initial reconciliation run during mount. Check that the
  // binding is live before treating an empty fragment as "nothing was written".
  expect(
    ySyncPluginKey.getState(editor.prosemirrorState)?.binding,
  ).toBeTruthy();
  return editor;
}

export function registerEmptyDocBindingCases() {
  beforeEach(({ onTestFinished }) => {
    onTestFinished(() => {
      while (cleanups.length) {
        cleanups.pop()!();
      }
    });
  });

  describe("empty-doc collaborative binding", () => {
    it("mounting on an empty fragment yields the stable initialBlockId", async ({
      setupEditor,
    }) => {
      const doc = new Y.Doc();
      cleanups.push(() => doc.destroy());
      const editor = await mountCollab(setupEditor, doc.get("doc"));
      expect(editor.document.map((b) => b.id)).toEqual(["initialBlockId"]);
    });

    it("two editors mounted on clones of one empty doc agree on the block id", async ({
      setupEditor,
    }) => {
      const { editor: schemaEditor } = await setupEditor({ mountType: false });
      const seed = blocksToYDoc(schemaEditor, [], "doc");
      cleanups.push(() => seed.destroy());
      const editorA = await mountCollab(setupEditor, cloneDoc(seed).get("doc"));
      const editorB = await mountCollab(setupEditor, cloneDoc(seed).get("doc"));
      const idA = editorA.document.map((b) => b.id);
      const idB = editorB.document.map((b) => b.id);
      expect(idA).toEqual(["initialBlockId"]);
      expect(idB).toEqual(idA);
    });

    it("replace-then-merge on an empty doc converges to the single new block", async ({
      setupEditor,
    }) => {
      const { editor: schemaEditor } = await setupEditor({ mountType: false });
      const beforeDoc = blocksToYDoc(schemaEditor, [], "doc");
      cleanups.push(() => beforeDoc.destroy());
      const afterDoc = cloneDoc(beforeDoc);
      const userDoc = cloneDoc(beforeDoc);

      const userEditor = await mountCollab(setupEditor, userDoc.get("doc"));
      // With no provider, the local editor dispatch and Yjs observers reconcile
      // inline, before replaceBlocks or applyUpdate returns.
      userEditor.replaceBlocks(userEditor.document, [
        {
          id: "h0",
          type: "heading",
          props: { level: 1 },
          content: "New heading",
        },
      ]);

      Y.applyUpdate(afterDoc, Y.encodeStateAsUpdate(userDoc));
      expect(
        yDocToBlocks(schemaEditor, afterDoc, "doc").map((b) => b.id),
      ).toEqual(["h0"]);
    });

    it("deleting all blocks keeps the re-minted skeleton out of Y", async ({
      setupEditor,
    }) => {
      const { editor: schemaEditor } = await setupEditor({ mountType: false });
      // Deleting every block makes BlockNote mint a fresh empty paragraph
      // with a NEW random id. That skeleton is still initial content: it must
      // not seed the empty fragment, and the next real edit must converge to
      // just the new block. Regression for the e2e `addRemoveBlocks`
      // "to empty doc" failures, where the re-minted skeleton was committed
      // as a phantom paragraph (the id-sensitive pull divergence check
      // treated it as real content).
      const doc = new Y.Doc();
      cleanups.push(() => doc.destroy());
      const editor = await mountCollab(setupEditor, doc.get("doc"));
      editor.replaceBlocks(editor.document, []);
      expect(doc.get("doc").length).toBe(0);

      editor.replaceBlocks(editor.document, [
        {
          id: "h0",
          type: "heading",
          props: { level: 1 },
          content: "New heading",
        },
      ]);
      expect(sortedIds(schemaEditor, doc)).toEqual(["h0"]);
      expect(editor.document.map((b) => b.id)).toEqual(["h0"]);
    });

    it("mounting on an empty fragment does not write the skeleton to Y", async ({
      setupEditor,
    }) => {
      // The @y/prosemirror initial-content gate must engage: the local
      // schema-default skeleton stays invisible to the sync layer until real
      // content appears. If the mount commits its skeleton, every clone carries
      // a distinct Y item and merges keep phantoms.
      const doc = new Y.Doc();
      cleanups.push(() => doc.destroy());
      await mountCollab(setupEditor, doc.get("doc"));
      expect(doc.get("doc").length).toBe(0);
    });

    it("gallery flow: a read-only editor mounted on the empty merge doc leaves no phantom", async ({
      setupEditor,
    }) => {
      const { editor: schemaEditor } = await setupEditor({ mountType: false });
      // Mirrors VersionMerge: before/user/merge docs are clones of one empty
      // doc, and an editor is mounted on EACH (the read-only Diff mounts while
      // the merge doc is still empty). Forwarding the user's change into the
      // merge doc must converge to the single new block — the Diff editor's own
      // mount skeleton must not survive as an extra paragraph.
      const beforeDoc = blocksToYDoc(schemaEditor, [], "doc");
      cleanups.push(() => beforeDoc.destroy());
      const afterDoc = cloneDoc(beforeDoc);
      const userDoc = cloneDoc(beforeDoc);

      await mountCollab(setupEditor, beforeDoc.get("doc"));
      await mountCollab(setupEditor, afterDoc.get("doc"));
      const userEditor = await mountCollab(setupEditor, userDoc.get("doc"));
      userEditor.replaceBlocks(userEditor.document, [
        {
          id: "h0",
          type: "heading",
          props: { level: 1 },
          content: "New heading",
        },
      ]);

      Y.applyUpdate(afterDoc, Y.encodeStateAsUpdate(userDoc));
      expect(
        yDocToBlocks(schemaEditor, afterDoc, "doc").map((b) => b.id),
      ).toEqual(["h0"]);
    });
  });

  describe("multi-peer empty-doc initialization", () => {
    // Deliberately NOT covered: fully independent docs that each receive a
    // concurrent root insert and are merged after the fact. That merge yields
    // two sibling `blockGroup`s under a `doc` whose content expression allows
    // exactly one (`pm-nodes/Doc.ts`), which ProseMirror cannot represent in
    // any implementation — `deltaToPNode` throws `failed to create node: doc`.
    // That shape conflict predates the gate work (offline concurrent seeding)
    // and is a different problem from the init race.
    it("two peers on one shared empty doc converge through sequential edits", async ({
      setupEditor,
    }) => {
      const { editor: schemaEditor } = await setupEditor({ mountType: false });
      const doc = new Y.Doc();
      cleanups.push(() => doc.destroy());
      const editorA = await mountCollab(setupEditor, doc.get("doc"));
      const editorB = await mountCollab(setupEditor, doc.get("doc"));

      // Both skeletons stay local: the shared fragment is still empty.
      expect(doc.get("doc").length).toBe(0);

      // Peer's first edit seeds the single shared root …
      editorA.replaceBlocks(editorA.document, [
        { id: "block-a", type: "paragraph", content: "Alpha" },
      ]);

      expect(sortedIds(schemaEditor, doc)).toEqual(["block-a"]);
      expect(editorB.document.map((b) => b.id)).toEqual(["block-a"]);

      // … the other peer builds on it causally, no competing root appears.
      editorB.replaceBlocks(editorB.document, [
        { id: "block-a", type: "paragraph", content: "Alpha" },
        { id: "block-b", type: "paragraph", content: "Beta" },
      ]);

      expect(sortedIds(schemaEditor, doc)).toEqual(["block-a", "block-b"]);
      // Exactly one top-level blockGroup: no duplicate root content.
      expect(doc.get("doc").length).toBe(1);
      expect(JSON.stringify(editorA.document)).toBe(
        JSON.stringify(editorB.document),
      );
    });

    it("a late joiner mounting on the shared doc renders content with no phantom", async ({
      setupEditor,
    }) => {
      const { editor: schemaEditor } = await setupEditor({ mountType: false });
      const doc = new Y.Doc();
      cleanups.push(() => doc.destroy());
      const editorA = await mountCollab(setupEditor, doc.get("doc"));

      editorA.replaceBlocks(editorA.document, [
        { id: "block-a", type: "paragraph", content: "Alpha" },
      ]);

      // Late joiner mounts after content exists: the gate never arms
      // (ytype is non-empty at bind) and the shared content renders as-is.
      const editorB = await mountCollab(setupEditor, doc.get("doc"));

      expect(editorB.document.map((b) => b.id)).toEqual(["block-a"]);
      // Joining wrote nothing extra into the shared fragment.
      expect(sortedIds(schemaEditor, doc)).toEqual(["block-a"]);
      expect(doc.get("doc").length).toBe(1);

      // The joiner's edit flows back to the first peer, converging both views.
      editorB.replaceBlocks(editorB.document, [
        { id: "block-a", type: "paragraph", content: "Alpha" },
        { id: "block-b", type: "paragraph", content: "Beta" },
      ]);

      expect(sortedIds(schemaEditor, doc)).toEqual(["block-a", "block-b"]);
      expect(doc.get("doc").length).toBe(1);
      expect(JSON.stringify(editorA.document)).toBe(
        JSON.stringify(editorB.document),
      );
    });
  });
}
