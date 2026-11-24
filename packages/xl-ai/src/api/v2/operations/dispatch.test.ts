import type { Transaction } from "prosemirror-state";
import { describe, expect } from "vite-plus/test";

import type { SetupEditor } from "../../../../../../tests/src/commands/node/setupEditor.js";
import { applyOperations } from "./applyOperations.js";
import { dispatchUpdate } from "./dispatch.js";

/** The editor, and its transactions that change the document. */
async function setup(setupEditor: SetupEditor) {
  const { editor } = await setupEditor({
    initialContent: [
      { id: "a", type: "paragraph", content: "Alpha one two Omega" },
      { id: "b", type: "paragraph", content: "Beta" },
    ],
    trailingBlock: false,
  });
  const transactions: Transaction[] = [];
  editor._tiptapEditor.on("transaction", ({ transaction }) => {
    if (transaction.docChanged) {
      transactions.push(transaction);
    }
  });
  return { editor, transactions };
}

const text = (value: string) => [
  { type: "text" as const, text: value, styles: {} },
];

describe("dispatchUpdate", () => {
  it("dispatches all steps of a write in one transaction", async ({
    setupEditor,
  }) => {
    const { editor, transactions } = await setup(setupEditor);
    const tr = editor.prosemirrorState.tr;
    // Two changes in one paragraph, a change of a different block, and an
    // insert.
    applyOperations(tr, [
      {
        type: "update",
        id: "a",
        update: { content: text("First one two Last") },
      },
      {
        type: "update",
        id: "b",
        update: { props: { textAlignment: "right" } },
      },
      {
        type: "insert",
        block: {
          id: "new",
          type: "paragraph",
          props: {},
          content: text("New"),
          children: [],
        },
        reference: "a",
        placement: "after",
      },
    ]);
    expect(tr.steps.length).toBeGreaterThan(2);

    dispatchUpdate(editor, tr);

    expect(transactions).toHaveLength(1);
    expect(editor.document.map((block) => block.id)).toEqual(["a", "new", "b"]);
    expect(editor.getBlock("a")?.content).toMatchObject([
      { text: "First one two Last" },
    ]);
    expect(editor.getBlock("b")?.props).toMatchObject({
      textAlignment: "right",
    });
  });

  it("marks the transaction for the autolink plugin", async ({
    setupEditor,
  }) => {
    const { editor, transactions } = await setup(setupEditor);
    const tr = editor.prosemirrorState.tr;
    applyOperations(tr, [
      { type: "update", id: "b", update: { content: text("https://x.test") } },
    ]);

    dispatchUpdate(editor, tr);

    expect(transactions.map((t) => t.getMeta("preventAutolink"))).toEqual([
      true,
    ]);
  });

  it("dispatches nothing for a transaction without steps", async ({
    setupEditor,
  }) => {
    const { editor, transactions } = await setup(setupEditor);

    dispatchUpdate(editor, editor.prosemirrorState.tr);

    expect(transactions).toHaveLength(0);
  });
});
