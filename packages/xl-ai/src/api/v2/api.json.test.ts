import type { Block } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { computeJSONUpdate, updateDocumentFromJSON } from "./index.js";
import {
  addComment,
  commentedText,
  createCommentEditor,
} from "./testUtil/comments.js";
import { createEditor } from "./testUtil/fixtures.js";

const initial = [
  { id: "a", type: "paragraph" as const, content: "Alpha" },
  { id: "b", type: "paragraph" as const, content: "Beta" },
  { id: "c", type: "paragraph" as const, content: "Gamma" },
];

/** The document of a client: a copy that the client can change. */
function copy(blocks: Block<any, any, any>[]): Block<any, any, any>[] {
  return JSON.parse(JSON.stringify(blocks));
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

    const update = updateDocumentFromJSON(editor, { document });

    expect(update.operations).toEqual([
      { type: "update", id: "b", update: { props: { textColor: "red" } } },
    ]);
    expect(editor.getBlock("b")?.props).toMatchObject({ textColor: "red" });
  });

  it("inserts a block without an ID, removes a missing block, and moves a block", () => {
    const editor = createEditor(initial);
    const [a, b, c] = copy(editor.document);

    updateDocumentFromJSON(editor, {
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

    updateDocumentFromJSON(editor, { document, base });

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

    updateDocumentFromJSON(editor, { document });

    expect(commentedText(editor.prosemirrorState.doc, comment)).toBe("Hello");
  });
});
