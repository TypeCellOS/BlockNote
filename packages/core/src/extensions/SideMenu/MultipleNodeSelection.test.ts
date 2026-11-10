// @vitest-environment node
import { history, redo, undo } from "@tiptap/pm/history";
import { Schema } from "prosemirror-model";
import { EditorState, Selection, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import { MultipleNodeSelection } from "./MultipleNodeSelection.js";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: {},
  },
});

function paragraph(text: string) {
  return schema.nodes.paragraph.create(null, schema.text(text));
}

const doc = schema.nodes.doc.create(null, [
  paragraph("A"),
  paragraph("B"),
  paragraph("C"),
]);

describe("MultipleNodeSelection bookmarks", () => {
  it("round-trips a block selection through editor-state JSON", () => {
    const selection = MultipleNodeSelection.create(doc, 0, 3);
    const state = EditorState.create({ doc, selection });
    const restored = EditorState.fromJSON({ schema }, state.toJSON());

    expect(restored.selection.eq(selection)).toBe(true);
  });

  it.each([1, 2])("restores a selection of %i blocks", (count) => {
    const selection = MultipleNodeSelection.create(doc, 0, count * 3);
    const restored = selection.getBookmark().resolve(doc);

    expect(restored).toBeInstanceOf(MultipleNodeSelection);
    expect(restored.eq(selection)).toBe(true);
  });

  it("maps a selection past inserted blocks", () => {
    const selection = MultipleNodeSelection.create(doc, 3, 6);
    const tr = EditorState.create({ doc }).tr.insert(0, paragraph("X"));
    const restored = selection.getBookmark().map(tr.mapping).resolve(tr.doc);

    expect(restored).toBeInstanceOf(MultipleNodeSelection);
    expect(restored.eq(MultipleNodeSelection.create(tr.doc, 6, 9))).toBe(true);
  });

  it("maps edits inside the selected blocks", () => {
    const selection = MultipleNodeSelection.create(doc, 0, 6);
    const tr = EditorState.create({ doc }).tr.insertText("more", 2);
    const restored = selection.getBookmark().map(tr.mapping).resolve(tr.doc);

    expect(restored).toBeInstanceOf(MultipleNodeSelection);
    expect(restored.eq(MultipleNodeSelection.create(tr.doc, 0, 10))).toBe(true);
  });

  it.each([3, 6])("excludes blocks inserted at boundary %i", (pos) => {
    const selection = MultipleNodeSelection.create(doc, 3, 6);
    const tr = EditorState.create({ doc }).tr.insert(pos, paragraph("X"));
    const restored = selection.getBookmark().map(tr.mapping).resolve(tr.doc);
    const from = pos === 3 ? 6 : 3;

    expect(restored).toBeInstanceOf(MultipleNodeSelection);
    expect(
      restored.eq(MultipleNodeSelection.create(tr.doc, from, from + 3)),
    ).toBe(true);
  });

  it.each([3, 6])("keeps the live selection stable at boundary %i", (pos) => {
    const selection = MultipleNodeSelection.create(doc, 3, 6);
    const tr = EditorState.create({ doc }).tr.insert(pos, paragraph("X"));
    const mapped = selection.map(tr.doc, tr.mapping);
    const from = pos === 3 ? 6 : 3;

    expect(
      mapped.eq(MultipleNodeSelection.create(tr.doc, from, from + 3)),
    ).toBe(true);
  });

  it("falls back to a cursor when the selected blocks are deleted", () => {
    const selection = MultipleNodeSelection.create(doc, 0, 6);
    const tr = EditorState.create({ doc }).tr.delete(0, 6);
    const restored = selection.getBookmark().map(tr.mapping).resolve(tr.doc);

    expect(restored).toBeInstanceOf(TextSelection);
    expect(restored.empty).toBe(true);
    expect(restored.eq(Selection.near(tr.doc.resolve(0)))).toBe(true);
  });

  it("falls back when joining blocks removes a selection boundary", () => {
    const selection = MultipleNodeSelection.create(doc, 0, 3);
    const tr = EditorState.create({ doc }).tr.join(3);
    const restored = selection.getBookmark().map(tr.mapping).resolve(tr.doc);

    expect(restored).toBeInstanceOf(TextSelection);
    expect(restored.empty).toBe(true);
  });

  it.each([1, 2])("preserves %i selected blocks through undo/redo", (count) => {
    const selection = MultipleNodeSelection.create(doc, 0, count * 3);
    let state = EditorState.create({ doc, selection, plugins: [history()] });
    const content = selection.content().content;
    const tr = state.tr.delete(selection.from, selection.to);
    tr.insert(tr.doc.content.size, content);
    tr.setSelection(Selection.near(tr.doc.resolve(tr.doc.content.size)));
    state = state.apply(tr);
    const movedDoc = state.doc;

    function dispatch(transaction: typeof tr) {
      state = state.apply(transaction);
    }

    expect(undo(state, dispatch)).toBe(true);
    expect(state.doc.eq(doc)).toBe(true);
    expect(state.selection).toBeInstanceOf(MultipleNodeSelection);
    expect(state.selection.eq(selection)).toBe(true);
    expect(redo(state, dispatch)).toBe(true);
    expect(state.doc.eq(movedDoc)).toBe(true);
    expect(undo(state, dispatch)).toBe(true);
    expect(state.selection.eq(selection)).toBe(true);
  });
});
