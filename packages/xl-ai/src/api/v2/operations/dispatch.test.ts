import { BlockNoteEditor } from "@blocknote/core";
import { Plugin } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import { dispatchSteps } from "./dispatch.js";

/** The editor, and a counter of its transactions that change the document. */
function setup() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      { id: "a", type: "paragraph", content: "Alpha one two Omega" },
      { id: "b", type: "paragraph", content: "Beta" },
    ],
    trailingBlock: false,
  });
  let transactions = 0;
  editor._tiptapEditor.on("transaction", ({ transaction }) => {
    if (transaction.docChanged) {
      transactions++;
    }
  });
  return { editor, transactions: () => transactions };
}

/** The position of the first character of `text` in the document. */
function positionOf(editor: BlockNoteEditor<any, any, any>, text: string) {
  let found: number | undefined;
  editor.prosemirrorState.doc.descendants((node, pos) => {
    const index = node.isText ? (node.text ?? "").indexOf(text) : -1;
    if (found === undefined && index !== -1) {
      found = pos + index;
    }
  });
  if (found === undefined) {
    throw new Error(`Text ${JSON.stringify(text)} not found`);
  }
  return found;
}

describe("dispatchSteps", () => {
  it("dispatches two changes in one paragraph in two transactions", () => {
    const { editor, transactions } = setup();
    const tr = editor.prosemirrorState.tr;
    const alpha = positionOf(editor, "Alpha");
    const omega = positionOf(editor, "Omega");
    tr.insertText("Last", omega, omega + 5);
    tr.insertText("First", alpha, alpha + 5);

    dispatchSteps(editor, tr);

    expect(transactions()).toBe(2);
    expect(editor.getBlock("a")?.content).toMatchObject([
      { text: "First one two Last" },
    ]);
  });

  it("dispatches changes in different paragraphs in one transaction", () => {
    const { editor, transactions } = setup();
    const tr = editor.prosemirrorState.tr;
    const beta = positionOf(editor, "Beta");
    const alpha = positionOf(editor, "Alpha");
    tr.insertText("Bravo", beta, beta + 4);
    tr.insertText("First", alpha, alpha + 5);

    dispatchSteps(editor, tr);

    expect(transactions()).toBe(1);
    expect(editor.document.map((block) => block.content)).toMatchObject([
      [{ text: "First one two Omega" }],
      [{ text: "Bravo" }],
    ]);
  });

  it("moves the later steps if a plugin changes the document between two transactions", () => {
    // A plugin that puts "!" at the start of the first paragraph after each
    // change. Thus, the second transaction must apply after that character.
    const editor = BlockNoteEditor.create({
      initialContent: [
        { id: "a", type: "paragraph", content: "!Alpha one two Omega" },
      ],
      trailingBlock: false,
    });
    editor._tiptapEditor.registerPlugin(
      new Plugin({
        appendTransaction(transactions, _old, state) {
          const first = state.doc.firstChild?.firstChild?.firstChild;
          if (
            !transactions.some((tr) => tr.docChanged) ||
            first === null ||
            first === undefined ||
            first.textContent.startsWith("!")
          ) {
            return null;
          }
          // The text of the first block starts 3 positions into the document.
          return state.tr.insertText("!", 3);
        },
      }),
    );
    const tr = editor.prosemirrorState.tr;
    const alpha = positionOf(editor, "Alpha");
    const omega = positionOf(editor, "Omega");
    // The first step removes the "!": the plugin then adds it again.
    tr.delete(alpha - 1, alpha);
    tr.insertText("Last", omega - 1, omega + 4);

    dispatchSteps(editor, tr);

    expect(editor.getBlock("a")?.content).toMatchObject([
      { text: "!Alpha one two Last" },
    ]);
  });
});
