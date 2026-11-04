/**
 * @vitest-environment jsdom
 */
import * as Y from "@y/y";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYType } from "../utils.js";
import { withCollaboration } from "./index.js";
import type { ExperimentalVersionDiffs } from "./snapshotPreview.js";
import { createYVersionView } from "./Versioning.js";

/**
 * The experimental version-diff options only change how a diff is shown, so
 * every combination must work, and none changes what an edit stores.
 */

const editors: BlockNoteEditor<any, any, any>[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.unmount();
  }
});

function editorOn(doc: Y.Doc, experimental: ExperimentalVersionDiffs) {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: doc.get("doc"),
        user: { name: "Test", color: "#ff0000" },
        experimental,
      },
    }),
  );
  editor.mount(document.body.appendChild(document.createElement("div")));
  editors.push(editor);
  return editor;
}

const base = () => {
  const doc = new Y.Doc({ gc: false });
  doc.clientID = 100;
  const seed = BlockNoteEditor.create();
  seed.replaceBlocks(seed.document, [
    {
      id: "parent",
      type: "paragraph",
      content: "Parent",
      children: [{ id: "child", type: "paragraph", content: "Child" }],
    },
    { id: "x", type: "paragraph", content: "X" },
    { id: "next", type: "paragraph", content: "Next" },
  ]);
  blocksToYType(seed, seed.document, doc.get("doc"));
  return doc;
};

/** One user's edit of `from`, as the updates their client sends. */
function edit(
  from: Y.Doc,
  client: number,
  experimental: ExperimentalVersionDiffs,
  change: (editor: BlockNoteEditor<any, any, any>) => void,
) {
  const doc = new Y.Doc({ gc: false });
  doc.clientID = client;
  Y.applyUpdateV2(doc, Y.encodeStateAsUpdateV2(from));
  const editor = editorOn(doc, experimental);
  const updates: Uint8Array<ArrayBuffer>[] = [];
  doc.on("updateV2", (update: Uint8Array<ArrayBuffer>) => updates.push(update));
  change(editor);
  return Y.mergeUpdatesV2(updates);
}

/** Changes shown in the diff, as `kind text: users`. */
function diff(
  experimental: ExperimentalVersionDiffs,
  edits: Array<[client: number, user: string, change: (e: any) => void]>,
) {
  const start = base();
  const server = new Y.Doc({ gc: false });
  Y.applyUpdateV2(server, Y.encodeStateAsUpdateV2(start));
  const attributions = Y.createContentMap();
  const updates = edits.map(([client, user, change]) => {
    const update = edit(start, client, experimental, change);
    return { update, user };
  });
  for (const { update, user } of updates) {
    const before = Y.createInsertSetFromStructStore(server.store, false);
    Y.applyUpdateV2(server, update);
    Y.insertIntoIdMap(
      attributions.inserts,
      Y.createIdMapFromIdSet(
        Y.diffIdSet(
          Y.createInsertSetFromStructStore(server.store, false),
          before,
        ),
        [Y.createContentAttribute("insert", user)],
      ),
    );
    Y.insertIntoIdMap(
      attributions.deletes,
      Y.createIdMapFromIdSet(Y.decodeUpdateV2(update).ds, [
        Y.createContentAttribute("delete", user),
      ]),
    );
  }
  const after = Y.encodeStateAsUpdateV2(server);
  const viewDoc = new Y.Doc();
  Y.applyUpdateV2(viewDoc, after);
  const editor = editorOn(viewDoc, experimental);
  const stored = Y.encodeStateAsUpdateV2(viewDoc);
  let writes = 0;
  viewDoc.on("update", () => writes++);
  const view = createYVersionView(editor, viewDoc.get("doc")).open();
  view.show({
    content: after,
    comparison: { content: Y.encodeStateAsUpdateV2(start), attributions },
    target: { type: "snapshot", id: "after" },
  });
  const out: string[] = [];
  editor.prosemirrorState.doc.descendants((node) => {
    for (const mark of node.marks) {
      if (!node.isText || !mark.type.name.startsWith("y-attributed-")) {
        continue;
      }
      const kind = mark.type.name.slice(13);
      out.push(
        `${kind} ${node.text}: ${(mark.attrs["userIds"] ?? []).join(",")}`,
      );
    }
    // Block-level: inserted, deleted and moved blocks, and formatting changes.
    if (node.type.name === "blockContainer") {
      for (const mark of node.marks) {
        const kind = !mark.attrs["moved"]
          ? mark.type.name.slice(13)
          : mark.type.name === "y-attributed-delete"
            ? "moved from"
            : "moved";
        if (["insert", "delete", "moved", "moved from"].includes(kind)) {
          out.push(
            `${kind} block ${node.firstChild!.textContent}: ${(mark.attrs["userIds"] ?? []).join(",")}`,
          );
        }
      }
    }
    if (
      node.isTextblock &&
      node.marks.some((mark) => mark.type.name === "y-attributed-attrs") &&
      !node.marks.some((mark) => mark.type.name !== "y-attributed-attrs")
    ) {
      out.push(`formatting ${node.textContent}`);
    }
    return true;
  });
  view.close();
  // Showing a diff never writes to the document.
  expect(writes).toBe(0);
  expect(Y.encodeStateAsUpdateV2(viewDoc)).toEqual(stored);
  return out;
}

const nest = (id: string) => (editor: any) => {
  editor.setTextCursorPosition(id);
  editor.nestBlock();
};
const scenarios: Record<string, Array<[number, string, (e: any) => void]>> = {
  "move into a concurrently deleted block": [
    [1, "alice", (editor) => editor.removeBlocks(["parent"])],
    [2, "bob", nest("x")],
  ],
  "type change": [
    [2, "bob", (editor) => editor.updateBlock("x", { type: "heading" })],
  ],
  indent: [[2, "bob", nest("x")]],
  "move up": [
    [
      2,
      "bob",
      (editor) => {
        editor.setTextCursorPosition("next");
        editor.moveBlocksUp();
      },
    ],
  ],
  "text edit": [
    [
      2,
      "bob",
      (editor) => {
        editor.setTextCursorPosition("x", "end");
        editor.insertInlineContent("!");
      },
    ],
  ],
};

const combinations: ExperimentalVersionDiffs[] = [
  {},
  { versionDiffFixes: "implicitDeleteAttribution" },
  { versionDiffFixes: "implicitDeleteAttributionAndRecreatedBlocks" },
];

describe.each(combinations)("experimental diffs %o", (experimental) => {
  it.each(Object.entries(scenarios))("%s", (_, edits) => {
    expect(diff(experimental, edits)).toMatchSnapshot();
  });
});

it("stores the same edits with any combination", () => {
  for (const edits of Object.values(scenarios)) {
    const stored = combinations.map((experimental) =>
      edits.map(([client, , change]) =>
        Array.from(edit(base(), client, experimental, change)),
      ),
    );
    for (const other of stored.slice(1)) {
      expect(other).toEqual(stored[0]);
    }
  }
});
