import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import type { Node } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { expect } from "vite-plus/test";
import { testOptionsHost } from "../../testOptions.js";
import { IncrementSelectionTestCase } from "./incrementSelectionTestCase.js";

function getTextPositions(doc: Node) {
  const positions: number[] = [];
  for (let pos = 0; pos <= doc.content.size; pos++) {
    // TextSelection endpoints can sit at either edge of inline content,
    // but not in the surrounding block, table, or document wrappers.
    if (doc.resolve(pos).parent.inlineContent) {
      positions.push(pos);
    }
  }
  return positions;
}

async function testIncrementSelection<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: IncrementSelectionTestCase<B, I, S>,
  edge: "start" | "end",
) {
  (testOptionsHost.__TEST_OPTIONS ??= {}).mockID = 0;
  editor.replaceBlocks(editor.document, testCase.document);

  const positions = editor.transact((tr) => getTextPositions(tr.doc));
  const first = positions.at(0);
  const last = positions.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("Expected a fixture with at least one text position");
  }

  const snapshots = [];
  for (const pos of positions) {
    const [from, to] = edge === "start" ? [pos, last] : [first, pos];
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, from, to)),
    );

    snapshots.push(
      JSON.stringify(editor.getSelectionCutBlocks(testCase.expandToWord)),
    );
  }

  await expect(snapshots.join("\n") + "\n").toMatchFileSnapshot(
    `./__snapshots__/${edge}/${testCase.name}.txt`,
  );
}

export function testIncrementSelectionStart<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: IncrementSelectionTestCase<B, I, S>,
) {
  return testIncrementSelection(editor, testCase, "start");
}

export function testIncrementSelectionEnd<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: IncrementSelectionTestCase<B, I, S>,
) {
  return testIncrementSelection(editor, testCase, "end");
}
