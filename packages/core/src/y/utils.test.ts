import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { afterEach, describe, expect } from "vite-plus/test";
import { docToDelta } from "@y/prosemirror";
import type { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import * as Y from "@y/y";
import { registerRoundTripUtilsTests } from "../yjs/roundTripUtils.test.cases.js";
import { AttributionExtension } from "./extensions/AttributionExtension.js";
import {
  _blocksToProsemirrorNode,
  blocksToYDoc,
  blocksToYType,
  collectFragmentIds,
  docDiffToDelta,
  yNodeToTransaction,
  yDocToBlocks,
  yfragmentToBlocks,
} from "./utils.js";

describe("collectFragmentIds", () => {
  it.each(["document", "update"] as const)(
    "collects deleted descendants from a %s without including other roots",
    (input) => {
      const doc = new Y.Doc({ gc: false });
      const client = new Y.Doc();
      try {
        const fragment = doc.get("test");
        const nested = new Y.Node();
        fragment.push([nested]);
        nested.push(["Deleted content"]);
        const expected = Y.createContentIdsFromUpdate(
          Y.encodeStateAsUpdate(doc),
        ).inserts;
        fragment.delete(0, 1);
        doc.get("other").push(["Unrelated content"]);
        const update = Y.encodeStateAsUpdate(doc);
        Y.applyUpdate(client, update);

        let destroyed = false;
        doc.on("destroy", () => {
          destroyed = true;
        });
        const ids = collectFragmentIds(
          client.get("test"),
          input === "document" ? doc : update,
        );

        expect(ids).toEqual(expected);
        expect(destroyed).toBe(false);
      } finally {
        client.destroy();
        doc.destroy();
      }
    },
  );
});

registerRoundTripUtilsTests({
  name: "Test y (v14) utils",
  javascriptSample: 'console.log("Hello, world!");',
  blocksToProseMirror: _blocksToProsemirrorNode,
  roundTripDocument(editor, blocks) {
    const doc = blocksToYDoc(editor, blocks);
    try {
      return yDocToBlocks(editor, doc);
    } finally {
      doc.destroy();
    }
  },
  roundTripFragment(editor, blocks) {
    const doc = new Y.Doc();
    try {
      const fragment = doc.get("test");
      blocksToYType(editor, blocks, fragment);
      return yfragmentToBlocks(editor, fragment);
    } finally {
      doc.destroy();
    }
  },
});

describe("yNodeToTransaction", () => {
  const docs: Y.Doc[] = [];

  afterEach(() => {
    docs.splice(0).forEach((doc) => doc.destroy());
  });

  function paragraph(editor: BlockNoteEditor, text: string) {
    return _blocksToProsemirrorNode(editor, [
      { id: "paragraph", type: "paragraph", content: text },
    ]);
  }

  function createDiff(before: Node, after: Node, author: string) {
    const baseline = new Y.Doc({ gc: false });
    const target = new Y.Doc({ gc: false });
    docs.push(baseline, target);
    baseline.get("prosemirror").applyDelta(docToDelta(before));
    Y.applyUpdateV2(target, Y.encodeStateAsUpdateV2(baseline));
    const attributions = Y.createContentMap();
    target.on("beforeObserverCalls", (tr) => {
      Y.insertIntoIdMap(
        attributions.inserts,
        Y.createIdMapFromIdSet(tr.insertSet, [
          Y.createContentAttribute("insert", author),
        ]),
      );
      Y.insertIntoIdMap(
        attributions.deletes,
        Y.createIdMapFromIdSet(tr.deleteSet, [
          Y.createContentAttribute("delete", author),
        ]),
      );
    });
    const node = target.get("prosemirror");
    node.applyDelta(docDiffToDelta(before, after));
    const renderer = Y.createDiffRenderer(baseline, target, { attributions });
    return { node, renderer };
  }

  function expectTextAttributions(
    doc: Node,
    expected: {
      plain: string;
      inserted: string;
      deleted: string;
      author: string;
    },
  ) {
    let plain = "";
    let inserted = "";
    let deleted = "";
    doc.descendants((node) => {
      if (!node.isText) {
        return;
      }
      const marks = node.marks.filter((mark) =>
        mark.type.name.startsWith("y-attributed-"),
      );
      if (marks.length === 0) {
        plain += node.text;
      } else {
        expect(marks).toHaveLength(1);
        const mark = marks[0];
        expect(mark.attrs.userIds).toEqual([expected.author]);
        expect(["y-attributed-insert", "y-attributed-delete"]).toContain(
          mark.type.name,
        );
        if (mark.type.name === "y-attributed-insert") {
          inserted += node.text;
        } else {
          deleted += node.text;
        }
      }
    });
    expect({ plain, inserted, deleted }).toEqual({
      plain: expected.plain,
      inserted: expected.inserted,
      deleted: expected.deleted,
    });
    doc.check();
  }

  it("renders insertions and deletions over a normal document without writing to Y", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      extensions: [AttributionExtension()],
    });
    const before = paragraph(editor, "kept old");
    const { node, renderer } = createDiff(
      before,
      paragraph(editor, "kept NEW"),
      "alice",
    );
    const update = Y.encodeStateAsUpdateV2(node.doc!);
    const state = EditorState.create({ doc: before });
    const tr = state.tr;

    expect(yNodeToTransaction(tr, node, { renderer })).toBe(tr);
    expectTextAttributions(state.apply(tr).doc, {
      plain: "kept ",
      inserted: "NEW",
      deleted: "old",
      author: "alice",
    });
    expect(tr.getMeta("y-sync-hydration")?.delta).toBeDefined();
    expect(Y.encodeStateAsUpdateV2(node.doc!)).toEqual(update);
    expect(state.doc.eq(before)).toBe(true);
  });

  it("replaces an attributed preview without retaining its content or marks", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      extensions: [AttributionExtension()],
    });
    const before = paragraph(editor, "kept old");
    const first = createDiff(before, paragraph(editor, "kept NEW"), "alice");
    const second = createDiff(before, paragraph(editor, "kept XYZ"), "bob");
    const initial = EditorState.create({ doc: before });
    const preview = initial.apply(
      yNodeToTransaction(initial.tr, first.node, first),
    );
    const tr = yNodeToTransaction(preview.tr, second.node, second);

    expectTextAttributions(preview.apply(tr).doc, {
      plain: "kept ",
      inserted: "XYZ",
      deleted: "old",
      author: "bob",
    });
    const fresh = yNodeToTransaction(initial.tr, second.node, second);
    expect(tr.doc.eq(fresh.doc)).toBe(true);
    expect(tr.doc.textContent).not.toContain("NEW");
    const next = preview.apply(tr);
    expect(yNodeToTransaction(next.tr, second.node, second).steps).toHaveLength(
      0,
    );
  });

  it("updates attribution when the rendered text is unchanged", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      extensions: [AttributionExtension()],
    });
    const before = paragraph(editor, "kept old");
    const after = paragraph(editor, "kept NEW");
    const first = createDiff(before, after, "alice");
    const second = createDiff(before, after, "bob");
    const initial = EditorState.create({ doc: before });
    const preview = initial.apply(
      yNodeToTransaction(initial.tr, first.node, first),
    );
    const tr = yNodeToTransaction(preview.tr, second.node, second);

    expect(tr.doc.textContent).toBe(preview.doc.textContent);
    expect(tr.docChanged).toBe(true);
    expectTextAttributions(preview.apply(tr).doc, {
      plain: "kept ",
      inserted: "NEW",
      deleted: "old",
      author: "bob",
    });
  });

  it("removes attribution for a plain render and is a no-op when rendered again", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      extensions: [AttributionExtension()],
    });
    const before = paragraph(editor, "kept old");
    const after = paragraph(editor, "kept NEW");
    const diff = createDiff(before, after, "alice");
    const initial = EditorState.create({ doc: before });
    const preview = initial.apply(
      yNodeToTransaction(initial.tr, diff.node, diff),
    );
    const tr = yNodeToTransaction(preview.tr, diff.node);

    expect(tr.doc.eq(after)).toBe(true);
    const restored = preview.apply(tr);
    expect(yNodeToTransaction(restored.tr, diff.node).steps).toHaveLength(0);
  });

  it("diffs from the transaction's current document and preserves existing steps and metadata", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      extensions: [AttributionExtension()],
    });
    const before = paragraph(editor, "kept old");
    const diff = createDiff(before, paragraph(editor, "kept NEW"), "alice");
    const state = EditorState.create({ doc: before });
    const tr = state.tr.insertText("temporary", 3).setMeta("caller", "preview");
    const firstStep = tr.steps[0];

    yNodeToTransaction(tr, diff.node, diff);

    expect(tr.steps[0]).toBe(firstStep);
    expect(tr.getMeta("caller")).toBe("preview");
    expectTextAttributions(state.apply(tr).doc, {
      plain: "kept ",
      inserted: "NEW",
      deleted: "old",
      author: "alice",
    });
  });

  it("switches attribution on replaced blocks while preserving their formatting", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      extensions: [AttributionExtension()],
    });
    const before = paragraph(editor, "kept old");
    const after = _blocksToProsemirrorNode(editor, [
      {
        id: "paragraph",
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "NEW", styles: { bold: true } }],
      },
    ]);
    const first = createDiff(before, after, "alice");
    const second = createDiff(before, after, "bob");
    const state = EditorState.create({ doc: before });
    const preview = state.apply(
      yNodeToTransaction(state.tr, first.node, first),
    );
    const tr = yNodeToTransaction(preview.tr, second.node, second);

    tr.doc.check();
    const group = tr.doc.firstChild!;
    expect(group.childCount).toBe(2);
    const deleted = group.child(0);
    const inserted = group.child(1);
    expect(deleted.firstChild!.type.name).toBe("paragraph");
    expect(
      deleted.marks
        .filter((mark) => mark.type.name === "y-attributed-delete")
        .map((mark) => mark.toJSON()),
    ).toEqual([{ type: "y-attributed-delete", attrs: { userIds: ["bob"] } }]);
    expect(
      inserted.marks
        .filter((mark) => mark.type.name === "y-attributed-insert")
        .map((mark) => mark.toJSON()),
    ).toEqual([{ type: "y-attributed-insert", attrs: { userIds: ["bob"] } }]);
    const heading = inserted.firstChild!;
    expect(heading.type.name).toBe("heading");
    expect(heading.attrs.level).toBe(2);
    expect(heading.firstChild!.marks.map((mark) => mark.type.name)).toContain(
      "bold",
    );
    expect(heading.textContent).toBe("NEW");
    expect(
      tr.doc.eq(yNodeToTransaction(state.tr, second.node, second).doc),
    ).toBe(true);
  });
});
