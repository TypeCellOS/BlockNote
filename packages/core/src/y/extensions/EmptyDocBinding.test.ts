/**
 * @vitest-environment jsdom
 *
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
 */
import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Y from "@y/y";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYDoc, yDocToBlocks } from "../utils.js";
import { withCollaboration } from "./index.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) {
    cleanups.pop()!();
  }
});

async function tick(times = 10) {
  for (let i = 0; i < times; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// Headless editor, used only for its schema when seeding / reading Y.Docs.
let schemaEditor: BlockNoteEditor | undefined;
function getSchemaEditor() {
  return (schemaEditor ??= BlockNoteEditor.create());
}

function cloneDoc(source: Y.Doc): Y.Doc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(source));
  cleanups.push(() => doc.destroy());
  return doc;
}

function mountCollab(fragment: Y.Node): BlockNoteEditor {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        provider: undefined,
        user: { name: "Test User", color: "#FF0000" },
      },
    }),
  );
  const div = document.createElement("div");
  document.body.appendChild(div);
  editor.mount(div);
  cleanups.push(() => {
    editor.unmount();
    div.remove();
  });
  return editor;
}

describe("empty-doc collaborative binding", () => {
  it("seeds an empty Y.Doc from an empty block array", () => {
    const seed = blocksToYDoc(getSchemaEditor(), [], "doc");
    cleanups.push(() => seed.destroy());
    expect(yDocToBlocks(getSchemaEditor(), seed, "doc")).toEqual([]);
  });

  it("mounting on an empty fragment yields the stable initialBlockId", async () => {
    const doc = new Y.Doc();
    cleanups.push(() => doc.destroy());
    const editor = mountCollab(doc.get("doc"));
    await tick();
    expect(editor.document.map((b) => b.id)).toEqual(["initialBlockId"]);
  });

  it("two editors mounted on clones of one empty doc agree on the block id", async () => {
    const seed = blocksToYDoc(getSchemaEditor(), [], "doc");
    cleanups.push(() => seed.destroy());
    const editorA = mountCollab(cloneDoc(seed).get("doc"));
    const editorB = mountCollab(cloneDoc(seed).get("doc"));
    await tick();
    const idA = editorA.document.map((b) => b.id);
    const idB = editorB.document.map((b) => b.id);
    expect(idA).toEqual(["initialBlockId"]);
    expect(idB).toEqual(idA);
  });

  it("replace-then-merge on an empty doc converges to the single new block", async () => {
    const beforeDoc = blocksToYDoc(getSchemaEditor(), [], "doc");
    cleanups.push(() => beforeDoc.destroy());
    const afterDoc = cloneDoc(beforeDoc);
    const userDoc = cloneDoc(beforeDoc);

    const userEditor = mountCollab(userDoc.get("doc"));
    await tick();
    userEditor.replaceBlocks(userEditor.document, [
      {
        id: "h0",
        type: "heading",
        props: { level: 1 },
        content: "New heading",
      },
    ]);
    await tick();

    Y.applyUpdate(afterDoc, Y.encodeStateAsUpdate(userDoc));
    expect(
      yDocToBlocks(getSchemaEditor(), afterDoc, "doc").map((b) => b.id),
    ).toEqual(["h0"]);
  });

  it("mounting on an empty fragment does not write the skeleton to Y", async () => {
    // The @y/prosemirror initial-content gate must engage: the local
    // schema-default skeleton stays invisible to the sync layer until real
    // content appears. If the mount commits its skeleton, every clone carries
    // a distinct Y item and merges keep phantoms.
    const doc = new Y.Doc();
    cleanups.push(() => doc.destroy());
    mountCollab(doc.get("doc"));
    await tick();
    expect(doc.get("doc").length).toBe(0);
  });

  it("gallery flow: a read-only editor mounted on the empty merge doc leaves no phantom", async () => {
    // Mirrors VersionMerge: before/user/merge docs are clones of one empty
    // doc, and an editor is mounted on EACH (the read-only Diff mounts while
    // the merge doc is still empty). Forwarding the user's change into the
    // merge doc must converge to the single new block — the Diff editor's own
    // mount skeleton must not survive as an extra paragraph.
    const beforeDoc = blocksToYDoc(getSchemaEditor(), [], "doc");
    cleanups.push(() => beforeDoc.destroy());
    const afterDoc = cloneDoc(beforeDoc);
    const userDoc = cloneDoc(beforeDoc);

    mountCollab(beforeDoc.get("doc"));
    mountCollab(afterDoc.get("doc"));
    const userEditor = mountCollab(userDoc.get("doc"));
    await tick();
    userEditor.replaceBlocks(userEditor.document, [
      {
        id: "h0",
        type: "heading",
        props: { level: 1 },
        content: "New heading",
      },
    ]);
    await tick();

    Y.applyUpdate(afterDoc, Y.encodeStateAsUpdate(userDoc));
    await tick();
    expect(
      yDocToBlocks(getSchemaEditor(), afterDoc, "doc").map((b) => b.id),
    ).toEqual(["h0"]);
  });
});
