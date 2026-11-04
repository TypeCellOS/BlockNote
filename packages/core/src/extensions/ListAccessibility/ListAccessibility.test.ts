// @vitest-environment node
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import {
  createListAccessibilityPlugin,
  listAccessibilityKey,
} from "./ListAccessibility.js";

const schema = new Schema({
  nodes: {
    doc: { content: "holder" },
    holder: { content: "blockContainer*" },
    blockContainer: { content: "(bullet | numbered | paragraph) holder?" },
    bullet: { content: "text*" },
    numbered: { content: "text*" },
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

function createState(blocks: ReturnType<typeof schema.node>[]) {
  return EditorState.create({
    schema,
    doc: schema.node("doc", null, schema.node("holder", null, blocks)),
    plugins: [createListAccessibilityPlugin(new Set(["bullet", "numbered"]))],
  });
}

function entries(state: EditorState) {
  return listAccessibilityKey
    .getState(state)!
    .decorations.find()
    .sort((a, b) => a.from - b.from)
    .map(({ spec }) => spec.listItem);
}

describe("list accessibility plugin", () => {
  it("decorates consecutive same-type list items and separates other types", () => {
    const value = createState([
      block("bullet"),
      block("bullet"),
      block("numbered"),
      block("paragraph"),
      block("bullet"),
    ]);
    const result = entries(value);

    expect(result.map((item) => item.owner)).toEqual([true, false, true, true]);
    expect(result[0].members).toEqual([result[1].id]);
    expect(result[1].members).toEqual([]);
    expect(result[2].members).toEqual([]);
    expect(result[3].members).toEqual([]);
  });

  it("starts a separate run for nested children", () => {
    const value = createState([
      block(
        "bullet",
        schema.node("holder", null, [block("bullet"), block("bullet")]),
      ),
      block("bullet"),
    ]);
    const result = entries(value);

    expect(result.map((item) => item.owner)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(result[0].members).toEqual([result[3].id]);
    expect(result[1].members).toEqual([result[2].id]);
  });

  it("recomputes after structural edits but reuses state on selection-only transactions", () => {
    let value = createState([block("bullet"), block("bullet")]);
    const before = listAccessibilityKey.getState(value)!;
    value = value.apply(value.tr.insert(1, block("paragraph")));
    const after = listAccessibilityKey.getState(value)!;

    expect(after).not.toBe(before);
    expect(entries(value).map((item) => item.owner)).toEqual([true, false]);

    const selectionOnly = value.apply(value.tr.setMeta("selectionOnly", true));
    expect(listAccessibilityKey.getState(selectionOnly)).toBe(after);
  });

  it("keeps list ownership stable through inline text edits", () => {
    const value = createState([block("bullet"), block("bullet")]);
    const before = entries(value);
    const updated = value.apply(value.tr.insertText("x", 3));
    const after = entries(updated);

    expect(listAccessibilityKey.getState(updated)).not.toBe(
      listAccessibilityKey.getState(value),
    );
    expect(after).toHaveLength(2);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(after[0].members).toEqual([after[1].id]);
  });
});
