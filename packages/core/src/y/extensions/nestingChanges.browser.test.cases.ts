import { pmnodeToDelta } from "@y/prosemirror";
import * as Y from "@y/y";
import { describe, expect, type TestContext } from "vite-plus/test";

import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import type { CommandContext } from "../../../../../tests/src/commands/index.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYType, yDocToBlocks } from "../utils.js";
import { withCollaboration } from "./index.js";
import { createYVersionView } from "./Versioning.js";

type Editor = BlockNoteEditor<any, any, any>;

async function collaborativeEditor(setupEditor: SetupEditor, doc: Y.Doc) {
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: {
        fragment: doc.get("doc"),
        user: { name: "Test", color: "#ff0000" },
      },
    }),
  });
  return editor;
}

type Seeding = "persistent" | "legacy";

/**
 * Two users editing copies of `blocks`, synced on demand.
 *
 * `persistent` seeds the document as `blocksToYType` writes it today: every
 * block has an (empty) `blockGroup` in Y. `legacy` writes the document as
 * older clients did, without groups until the first nesting, so concurrent
 * first nestings leave two groups in one container.
 */
type EditorFixtures = {
  setupEditor: CommandContext["setupEditor"];
  onTestFinished: TestContext["onTestFinished"];
};

async function twoUsers(
  { setupEditor, onTestFinished }: EditorFixtures,
  blocks: any[],
  seeding: Seeding = "persistent",
) {
  const docA = new Y.Doc({ gc: false });
  onTestFinished(() => docA.destroy());
  docA.clientID = 1;
  const { editor: seed } = await setupEditor({
    mountType: false,
    initialContent: blocks,
  });
  if (seeding === "persistent") {
    blocksToYType(seed, seed.document, docA.get("doc"));
  } else {
    docA.get("doc").applyDelta(seed.transact(({ doc }) => pmnodeToDelta(doc)));
  }
  const docB = new Y.Doc({ gc: false });
  onTestFinished(() => docB.destroy());
  docB.clientID = 2;
  Y.applyUpdateV2(docB, Y.encodeStateAsUpdateV2(docA));
  return {
    docA,
    a: await collaborativeEditor(setupEditor, docA),
    b: await collaborativeEditor(setupEditor, docB),
    sync() {
      const toB = Y.encodeStateAsUpdateV2(docA, Y.encodeStateVector(docB));
      const toA = Y.encodeStateAsUpdateV2(docB, Y.encodeStateVector(docA));
      Y.applyUpdateV2(docB, toB);
      Y.applyUpdateV2(docA, toA);
    },
  };
}

/** The document as nested text, e.g. `P{X, Z}, N`. */
function outline(blocks: any[]): string {
  return blocks
    .map(
      (block) =>
        block.content.map((c: any) => c.text).join("") +
        (block.children.length ? `{${outline(block.children)}}` : ""),
    )
    .join(", ");
}

/** Number of `blockGroup`s directly inside the Y container of block `id`. */
function groupsOf(doc: Y.Doc, id: string): number[] {
  const groups: number[] = [];
  const visit = (node: Y.Node) => {
    for (const child of node.toArray()) {
      if (!(child instanceof Y.Node)) {
        continue;
      }
      if (child.name === "blockContainer" && child.getAttr("id") === id) {
        for (const part of child.toArray()) {
          if (part instanceof Y.Node && part.name === "blockGroup") {
            groups.push(part.length);
          }
        }
      }
      visit(child);
    }
  };
  visit(doc.get("doc"));
  return groups;
}

export function registerNestingChangesCases() {
  registerConcurrentChildGroups();
  describe("persistent child groups", persistentChildGroups);
  describe("emptied child groups", emptiedChildGroups);
  describe("version diff of a nesting change", versionDiffOfNestingChange);
}

function registerConcurrentChildGroups() {
  const withSeeding = describe.each<{
    seeding: Seeding;
    /** p's groups after the concurrent first nesting, then after N is added, then after Z is removed */
    groups: [number[], number[], number[]];
  }>([
    // One group from the start: both users write into it.
    { seeding: "persistent", groups: [[2], [3], [2]] },
    // No group until the first nesting: each user creates one, the view merges
    // them, and edits route back into the group that holds the child.
    {
      seeding: "legacy",
      groups: [
        [1, 1],
        [2, 1],
        [2, 0],
      ],
    },
  ]);
  const title = "concurrently created child groups ($seeding document)";
  withSeeding(title, ({ seeding, groups }) => {
    async function nestedTwice(fixtures: EditorFixtures) {
      const users = await twoUsers(
        fixtures,
        [
          { id: "p", type: "paragraph", content: "P" },
          { id: "x", type: "paragraph", content: "X" },
        ],
        seeding,
      );
      users.a.setTextCursorPosition("x");
      users.a.nestBlock();
      users.b.updateBlock("p", {
        children: [{ id: "z", type: "paragraph", content: "Z" }],
      });
      users.sync();
      return users;
    }

    it("shows both children under one parent", async ({
      setupEditor,
      onTestFinished,
    }) => {
      const { a, b, docA } = await nestedTwice({
        setupEditor,
        onTestFinished,
      });
      expect(outline(a.document)).toBe("P{X, Z}");
      expect(outline(b.document)).toBe("P{X, Z}");
      // Y keeps every group; the view merges them.
      expect(groupsOf(docA, "p")).toEqual(groups[0]);
    });

    it("reads both children outside the editor", async ({
      setupEditor,
      onTestFinished,
    }) => {
      const { docA } = await nestedTwice({
        setupEditor,
        onTestFinished,
      });
      const { editor } = await setupEditor({ mountType: false });
      expect(outline(yDocToBlocks(editor, docA, "doc"))).toBe("P{X, Z}");
    });

    it("routes edits back to each child's own group", async ({
      setupEditor,
      onTestFinished,
    }) => {
      const users = await nestedTwice({
        setupEditor,
        onTestFinished,
      });
      users.a.setTextCursorPosition("z", "end");
      users.a.insertInlineContent("!");
      users.a.insertBlocks(
        [{ id: "n", type: "paragraph", content: "N" }],
        "x",
        "after",
      );
      users.sync();
      expect(outline(users.b.document)).toBe("P{X, N, Z!}");
      expect(groupsOf(users.docA, "p")).toEqual(groups[1]);

      users.a.removeBlocks(["z"]);
      users.sync();
      expect(outline(users.b.document)).toBe("P{X, N}");
      // The emptied group is kept, hidden.
      expect(groupsOf(users.docA, "p")).toEqual(groups[2]);
    });
  });
}

function persistentChildGroups() {
  it("gives a new block an empty group, hidden from the editor", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const users = await twoUsers({ setupEditor, onTestFinished }, [
      { id: "p", type: "paragraph", content: "P" },
    ]);
    expect(groupsOf(users.docA, "p")).toEqual([0]);
    users.a.insertBlocks(
      [{ id: "n", type: "paragraph", content: "N" }],
      "p",
      "after",
    );
    users.sync();
    expect(groupsOf(users.docA, "n")).toEqual([0]);
    expect(outline(users.b.document)).toBe("P, N");
    expect(users.b.getBlock("n")?.children).toEqual([]);
  });

  it("gives a legacy block no group until something is nested under it", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const users = await twoUsers(
      { setupEditor, onTestFinished },
      [
        { id: "p", type: "paragraph", content: "P" },
        { id: "x", type: "paragraph", content: "X" },
      ],
      "legacy",
    );
    expect(groupsOf(users.docA, "p")).toEqual([]);
    users.a.setTextCursorPosition("p", "end");
    users.a.insertInlineContent("!");
    users.sync();
    expect(groupsOf(users.docA, "p")).toEqual([]);
    users.b.setTextCursorPosition("x");
    users.b.nestBlock();
    users.sync();
    expect(groupsOf(users.docA, "p")).toEqual([1]);
    expect(outline(users.a.document)).toBe("P!{X}");
  });
}

function emptiedChildGroups() {
  it("keeps a child added while another user removes the last one", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const users = await twoUsers({ setupEditor, onTestFinished }, [
      {
        id: "p",
        type: "paragraph",
        content: "P",
        children: [{ id: "c", type: "paragraph", content: "C" }],
      },
    ]);
    users.a.removeBlocks(["c"]);
    users.b.insertBlocks(
      [{ id: "d", type: "paragraph", content: "D" }],
      "c",
      "after",
    );
    users.sync();
    expect(outline(users.a.document)).toBe("P{D}");
    expect(outline(users.b.document)).toBe("P{D}");
  });

  it("reuses a hidden group when nesting again", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const users = await twoUsers({ setupEditor, onTestFinished }, [
      {
        id: "p",
        type: "paragraph",
        content: "P",
        children: [{ id: "c", type: "paragraph", content: "C" }],
      },
      { id: "x", type: "paragraph", content: "X" },
    ]);
    users.a.setTextCursorPosition("c");
    users.a.unnestBlock();
    expect(outline(users.a.document)).toBe("P, C, X");
    expect(groupsOf(users.docA, "p")).toEqual([0]);

    users.a.setTextCursorPosition("c");
    users.a.nestBlock();
    users.sync();
    expect(outline(users.b.document)).toBe("P{C}, X");
    expect(groupsOf(users.docA, "p")).toEqual([1]);
  });
}

function versionDiffOfNestingChange() {
  async function diffOf(
    { setupEditor, onTestFinished }: EditorFixtures,
    change: (editor: Editor) => void,
    blocks: any[],
  ) {
    const doc = new Y.Doc({ gc: false });
    onTestFinished(() => doc.destroy());
    const editor = await collaborativeEditor(setupEditor, doc);
    editor.replaceBlocks(editor.document, blocks);
    const before = Y.encodeStateAsUpdateV2(doc);
    change(editor);
    const after = Y.encodeStateAsUpdateV2(doc);
    const view = createYVersionView(editor, doc.get("doc")).open();
    onTestFinished(() => view.close());
    view.show({
      content: after,
      comparison: { content: before },
      target: { type: "snapshot", id: "after" },
    });
    const changed: string[] = [];
    editor.transact(({ doc }) =>
      doc.descendants((node) => {
        const mark = node.marks.find((mark) =>
          ["y-attributed-insert", "y-attributed-delete"].includes(
            mark.type.name,
          ),
        );
        if (node.type.name === "blockContainer" && mark) {
          changed.push(
            `${mark.attrs["moved"] ? ">" : mark.type.name === "y-attributed-insert" ? "+" : "-"}${node.firstChild!.textContent}`,
          );
        }
        return true;
      }),
    );
    view.close();
    return changed;
  }

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails("shows an indent as a moved block, leaving the new parent unchanged", async ({
    setupEditor,
    onTestFinished,
  }) => {
    expect(
      await diffOf(
        { setupEditor, onTestFinished },
        (editor) => {
          editor.setTextCursorPosition("x");
          editor.nestBlock();
        },
        [
          { id: "p", type: "paragraph", content: "P" },
          { id: "x", type: "paragraph", content: "X" },
        ],
      ),
    ).toEqual([">X"]);
  });

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails("shows an unindent as a moved block, leaving the old parent unchanged", async ({
    setupEditor,
    onTestFinished,
  }) => {
    expect(
      await diffOf(
        { setupEditor, onTestFinished },
        (editor) => {
          editor.setTextCursorPosition("c");
          editor.unnestBlock();
        },
        [
          {
            id: "p",
            type: "paragraph",
            content: "P",
            children: [{ id: "c", type: "paragraph", content: "C" }],
          },
        ],
      ),
    ).toEqual([">C"]);
  });
}
