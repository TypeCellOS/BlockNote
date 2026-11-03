import type { Block } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  computeJSONUpdate,
  type JSONUpdateOptions,
  updateDocumentFromJSON,
  type ValidTextUpdate,
} from "./index.js";
import {
  addComment,
  commentedText,
  createCommentEditor,
} from "./testUtil/comments.js";
import { createEditor } from "./testUtil/fixtures.js";
import { valid } from "./testUtil/valid.js";

const initial = [
  { id: "a", type: "paragraph" as const, content: "Alpha" },
  { id: "b", type: "paragraph" as const, content: "Beta" },
  { id: "c", type: "paragraph" as const, content: "Gamma" },
];

/** The document of a client: a copy that the client can change. */
function copy(blocks: Block<any, any, any>[]): Block<any, any, any>[] {
  return JSON.parse(JSON.stringify(blocks));
}

/** Applies the JSON, and fails the test if the result is an error. */
function update(
  editor: Parameters<typeof updateDocumentFromJSON>[0],
  options: JSONUpdateOptions,
): ValidTextUpdate {
  return valid(updateDocumentFromJSON(editor, options));
}

describe("JSON", () => {
  it("gives no operations for the same document", () => {
    const editor = createEditor(initial);
    expect(
      computeJSONUpdate(editor, { document: copy(editor.document) }),
    ).toEqual({ operations: [], warnings: [] });
  });

  it("updates only the changed field of a block, by its ID", () => {
    const editor = createEditor(initial);
    const document = copy(editor.document);
    document[1].props.textColor = "red";

    const result = update(editor, { document });

    expect(result.operations).toEqual([
      { type: "update", id: "b", update: { props: { textColor: "red" } } },
    ]);
    expect(editor.getBlock("b")?.props).toMatchObject({ textColor: "red" });
  });

  it("inserts a block without an ID, removes a missing block, and moves a block", () => {
    const editor = createEditor(initial);
    const [a, b, c] = copy(editor.document);

    update(editor, {
      document: [c, a, { type: "paragraph", content: "New" }],
    });

    expect(editor.document.map((block) => block.id).slice(0, 2)).toEqual([
      "c",
      "a",
    ]);
    expect(editor.getBlock(b.id)).toBeUndefined();
    expect(editor.document[2].content).toMatchObject([{ text: "New" }]);
  });

  it("keeps the change of another writer with a base", () => {
    const editor = createEditor(initial);
    const base = copy(editor.document);
    const document = copy(base);
    document[0].props.textColor = "red";
    // Another writer changes block c after the client read the document.
    editor.updateBlock("c", { content: "Gamma, edited" });

    update(editor, { document, base });

    expect(editor.getBlock("a")?.props).toMatchObject({ textColor: "red" });
    expect(editor.getBlock("c")?.content).toMatchObject([
      { text: "Gamma, edited" },
    ]);
  });

  it("keeps a comment on text that the client did not change", () => {
    const editor = createCommentEditor([
      { id: "p", type: "paragraph", content: "Hello world" },
    ]);
    const comment = addComment(editor, "Hello");
    const document = copy(editor.document);
    document[0].content = [
      { type: "text", text: "Hello brave world", styles: {} },
    ];

    update(editor, { document });

    expect(commentedText(editor.prosemirrorState.doc, comment)).toBe("Hello");
  });

  it("gives an error for a document that does not fit the schema, and does not change the document", () => {
    const editor = createEditor(initial);
    const before = copy(editor.document);

    for (const document of [
      [{ type: "unknown" }],
      [{ type: "paragraph", content: [{ type: "unknown" }] }],
      [{ type: "image", content: "Text in a block without content" }],
      [
        {
          type: "paragraph",
          content: [{ type: "text", text: "x", styles: { unknown: true } }],
        },
      ],
    ]) {
      expect(
        updateDocumentFromJSON(editor, {
          document: document as JSONUpdateOptions["document"],
        }),
      ).toEqual({
        error: "invalid-document",
      });
    }
    expect(editor.document).toEqual(before);
  });

  it("gives a new ID to a later block with the ID of an earlier block", () => {
    const editor = createEditor(initial);
    const [a, b] = copy(editor.document);
    const duplicate = { ...a, content: "Alpha, copy" };

    update(editor, { document: [a, duplicate, b] });

    const ids = editor.document.map((block) => block.id);
    expect(ids[0]).toBe("a");
    expect(ids[1]).not.toBe("a");
    expect(ids[2]).toBe("b");
    expect(editor.document[0].content).toMatchObject([{ text: "Alpha" }]);
    expect(editor.document[1].content).toMatchObject([{ text: "Alpha, copy" }]);
  });

  it("gives a new ID to a nested block with the ID of a block at a different level", () => {
    const editor = createEditor(initial);
    const [a, b, c] = copy(editor.document);
    const nested = { ...b, content: "Nested" };

    update(editor, { document: [a, { ...b, children: [nested] }, c] });

    const parent = editor.getBlock("b");
    expect(parent?.content).toMatchObject([{ text: "Beta" }]);
    expect(parent?.children).toHaveLength(1);
    expect(parent?.children[0].id).not.toBe("b");
    expect(parent?.children[0].content).toMatchObject([{ text: "Nested" }]);
  });

  it("with a base, gives a new ID to a block with the ID of a block that another writer added", () => {
    const editor = createEditor(initial);
    const base = copy(editor.document);
    // Another writer adds block d after the client read the document.
    editor.insertBlocks(
      [{ id: "d", type: "paragraph", content: "Delta" }],
      "c",
      "after",
    );
    // The client adds a block with the same ID, which it did not read.
    const document = [
      ...copy(base),
      { id: "d", type: "paragraph" as const, content: "Client block" },
    ];

    update(editor, { document, base });

    expect(editor.getBlock("d")?.content).toMatchObject([{ text: "Delta" }]);
    const texts = editor.document.map(
      (block) => (block.content as { text: string }[])[0]?.text,
    );
    expect(texts).toEqual(["Alpha", "Beta", "Gamma", "Client block", "Delta"]);
  });

  it("keeps a new ID that is not in the document", () => {
    const editor = createEditor(initial);
    const document = [
      ...copy(editor.document),
      { id: "new", type: "paragraph" as const, content: "New" },
    ];

    update(editor, { document });

    expect(editor.getBlock("new")?.content).toMatchObject([{ text: "New" }]);
  });

  it("reads children: null as no children, without an exception", () => {
    const editor = createEditor(initial);

    update(editor, {
      document: [
        { id: "a", type: "paragraph", content: "Alpha", children: null },
      ] as unknown as JSONUpdateOptions["document"],
    });

    expect(editor.document.map((block) => block.id)).toEqual(["a"]);
  });
});
