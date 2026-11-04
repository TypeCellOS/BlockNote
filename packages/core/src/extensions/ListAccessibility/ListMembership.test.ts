// @vitest-environment node
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import { createListDecorations } from "./ListMembership.js";

const schema = new Schema({
  nodes: {
    doc: { content: "holder" },
    holder: { content: "blockContainer*" },
    blockContainer: {
      content: "(bullet | paragraph) holder?",
    },
    bullet: { content: "text*" },
    paragraph: { content: "text*" },
    text: {},
  },
});

function block(type: string, children?: ReturnType<typeof schema.node>) {
  return schema.node("blockContainer", null, [
    schema.node(type, null, schema.text("item")),
    ...(children ? [children] : []),
  ]);
}

function state(blocks: ReturnType<typeof schema.node>[]) {
  return EditorState.create({
    schema,
    doc: schema.node("doc", null, schema.node("holder", null, blocks)),
  });
}

function items(doc: ReturnType<typeof schema.node>) {
  return createListDecorations(doc, new Set(["bullet"]))
    .find()
    .sort((a, b) => a.from - b.from)
    .map((decoration) => decoration.spec.listItem);
}

describe("list accessibility decorations", () => {
  it("groups exact-type sibling runs and gives each run one owner", () => {
    const value = state([
      block("bullet"),
      block("bullet"),
      block("paragraph"),
      block("bullet"),
    ]);
    const result = items(value.doc);

    expect(result.map((item) => item.owner)).toEqual([true, false, true]);
    expect(result[0].members).toEqual([result[1].id]);
    expect(result[1].members).toEqual([]);
    expect(result[2].members).toEqual([]);
    expect(new Set(result.map((item) => item.id)).size).toBe(result.length);
  });

  it("builds nested sibling runs independently", () => {
    const value = state([
      block(
        "bullet",
        schema.node("holder", null, [block("bullet"), block("bullet")]),
      ),
      block("bullet"),
    ]);
    const result = items(value.doc);

    expect(result.map((item) => item.owner)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(result[0].members).toEqual([result[3].id]);
    expect(result[1].members).toEqual([result[2].id]);
    expect(result[3].members).toEqual([]);
  });

  it("rebuilds after document edits without mutating the previous state", () => {
    const value = state([block("bullet"), block("bullet")]);
    const previous = items(value.doc);
    const next = value.apply(value.tr.insert(1, block("paragraph")));
    const rebuilt = items(next.doc);

    expect(rebuilt.map((item) => item.owner)).toEqual([true, false]);
    expect(previous.map((item) => item.owner)).toEqual([true, false]);
  });
});
