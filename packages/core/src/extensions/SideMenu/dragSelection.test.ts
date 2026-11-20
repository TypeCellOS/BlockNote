// @vitest-environment node
import type { Node } from "prosemirror-model";
import { NodeSelection, TextSelection } from "prosemirror-state";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

import { getNodeById } from "../../api/nodeUtil.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { MultipleNodeSelection } from "./MultipleNodeSelection.js";
import { captureDragSelection, readDragSelection } from "./dragSelection.js";

const editors: BlockNoteEditor[] = [];

function block(id: string, text = "abcdef") {
  return { id, type: "paragraph" as const, content: text };
}

function document(...blocks: PartialBlock[]) {
  const editor = BlockNoteEditor.create({ initialContent: blocks });
  editors.push(editor);
  return editor.prosemirrorState.doc;
}

function transfer() {
  const data = new Map<string, string>();
  return {
    setData(type: string, value: string) {
      data.set(type, value);
    },
    getData(type: string) {
      return data.get(type) ?? "";
    },
  };
}

let source: Node;
let a: Node;
let b: Node;
let dragged: MultipleNodeSelection;

beforeEach(() => {
  source = document(block("a"), block("b"));
  a = getNodeById("a", source)!.node;
  b = getNodeById("b", source)!.node;
  dragged = MultipleNodeSelection.create(source, 1, 1 + a.nodeSize);
});

afterEach(() => {
  for (const editor of editors) {
    editor._tiptapEditor.destroy();
  }
  editors.length = 0;
  vi.unstubAllGlobals();
});

describe("drag selection bookmarks", () => {
  it("captures and restores on HTTP LAN origins without crypto.randomUUID", () => {
    // getRandomValues is available in insecure contexts; randomUUID is not.
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });
    const data = transfer();
    const selection = TextSelection.create(source, 4, 6);
    captureDragSelection(data, selection, dragged);
    expect(readDragSelection(data).restore(source, dragged).toJSON()).toEqual(
      selection.toJSON(),
    );
  });

  it("maps a backwards multi-block text selection when moved earlier", () => {
    const original = document(block("c"), block("a"), block("b"));
    const c = getNodeById("c", original)!.node;
    const selection = TextSelection.create(
      original,
      c.nodeSize + a.nodeSize + 6,
      c.nodeSize + 4,
    );
    const wholeBlocks = MultipleNodeSelection.create(
      original,
      1 + c.nodeSize,
      1 + c.nodeSize + a.nodeSize + b.nodeSize,
    );
    const data = transfer();
    captureDragSelection(data, selection, wholeBlocks);
    const target = document(block("a"), block("b"), block("c"));
    const fallback = MultipleNodeSelection.create(
      target,
      1,
      1 + a.nodeSize + b.nodeSize,
    );
    expect(readDragSelection(data).restore(target, fallback).toJSON()).toEqual({
      type: "text",
      anchor: a.nodeSize + 6,
      head: 4,
    });
  });

  it.each([
    [4, 4],
    [4, 7],
    [7, 4],
  ])("preserves text anchor %i and head %i when moved", (anchor, head) => {
    const data = transfer();
    captureDragSelection(
      data,
      TextSelection.create(source, anchor, head),
      dragged,
    );
    const target = document(block("b"), block("a"));
    const fallback = MultipleNodeSelection.create(
      target,
      1 + b.nodeSize,
      1 + b.nodeSize + a.nodeSize,
    );
    const restored = readDragSelection(data).restore(target, fallback);
    expect(restored.toJSON()).toEqual({
      type: "text",
      anchor: anchor + b.nodeSize,
      head: head + b.nodeSize,
    });
  });

  it("restores the original node selection rather than converting its type", () => {
    const data = transfer();
    captureDragSelection(data, NodeSelection.create(source, 1), dragged);
    const target = document(block("b"), block("a"));
    const restored = readDragSelection(data).restore(
      target,
      TextSelection.create(target, 3 + b.nodeSize),
    );
    expect(restored.toJSON()).toEqual({ type: "node", anchor: 1 + b.nodeSize });
  });

  it("restores a whole-block bookmark after nesting the block", () => {
    const data = transfer();
    captureDragSelection(data, dragged, dragged);
    const target = document({
      id: "parent",
      type: "paragraph",
      content: "Parent",
      children: [block("a")],
    });
    const start = getNodeById("a", target)!.posBeforeNode;
    expect(
      readDragSelection(data)
        .restore(target, TextSelection.create(target, start + 2))
        .toJSON(),
    ).toEqual({
      type: "multiple-node",
      anchor: start,
      head: start + a.nodeSize,
    });
  });

  it("does not relocate a caret outside the dragged block", () => {
    const data = transfer();
    captureDragSelection(
      data,
      TextSelection.create(source, 3 + a.nodeSize),
      dragged,
    );
    expect(data.getData("blocknote/selection-bookmark")).toBe("");
    expect(readDragSelection(data).type).toBe("text");
  });

  it("falls back to the transferred category without a matching local bookmark", () => {
    const data = transfer();
    data.setData("blocknote/selection-type", "block");
    data.setData("blocknote/selection-bookmark", "another-realm");
    expect(readDragSelection(data).restore(source, dragged).toJSON()).toEqual(
      dragged.toJSON(),
    );
  });

  it("falls back safely when schema conversion changes the block span", () => {
    const data = transfer();
    captureDragSelection(data, TextSelection.create(source, 7, 4), dragged);
    const target = document(block("a", "x"));
    const fallback = MultipleNodeSelection.create(
      target,
      1,
      target.content.size - 1,
    );
    expect(
      readDragSelection(data)
        .restore(target, fallback)
        .eq(TextSelection.near(fallback.$to, -1)),
    ).toBe(true);
  });

  it("expands a multi-block text fallback to whole blocks", () => {
    const data = transfer();
    data.setData("blocknote/selection-type", "block");
    const fallback = TextSelection.create(source, 3, 3 + a.nodeSize);
    const restored = readDragSelection(data).restore(source, fallback);
    expect(restored.toJSON()).toEqual({
      type: "multiple-node",
      anchor: 1,
      head: 1 + a.nodeSize + b.nodeSize,
    });
    expect(restored.content().content.child(0).type.name).toBe(
      "blockContainer",
    );
  });

  it("restores into the inserted range, not existing matching IDs", () => {
    const data = transfer();
    captureDragSelection(data, TextSelection.create(source, 4), dragged);
    const target = document(block("a"), block("new-a"));
    const inserted = getNodeById("new-a", target)!;
    const fallback = TextSelection.create(target, inserted.posBeforeNode + 2);
    expect(readDragSelection(data).restore(target, fallback).toJSON()).toEqual({
      type: "text",
      anchor: inserted.posBeforeNode + 3,
      head: inserted.posBeforeNode + 3,
    });
  });
});
