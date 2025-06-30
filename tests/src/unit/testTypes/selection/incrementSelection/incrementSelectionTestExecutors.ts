import { expect } from "vitest";
import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";

import { IncrementSelectionTestCase } from "./incrementSelectionTestCase.js";

export const testIncrementSelectionStart = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: IncrementSelectionTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;
  editor.replaceBlocks(editor.document, testCase.document);

  const size = editor._tiptapEditor.state.doc.content.size;
  let ret = "";

  for (let i = 0; i < size; i++) {
    editor.transact((tr) =>
      tr.setSelection(
        TextSelection.create(editor._tiptapEditor.state.doc, i, size - 1),
      ),
    );

    const blockNoteSelection = editor.getSelectionCutBlocks();
    const JSONString = JSON.stringify(blockNoteSelection);

    ret += JSONString + "\n";
  }

  await expect(ret).toMatchFileSnapshot(
    `./__snapshots__/start/${testCase.name}.txt`,
  );
};

export const testIncrementSelectionEnd = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: IncrementSelectionTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;
  editor.replaceBlocks(editor.document, testCase.document);

  const size = editor._tiptapEditor.state.doc.content.size;
  let ret = "";

  for (let i = 0; i < size; i++) {
    editor.transact((tr) =>
      tr.setSelection(
        TextSelection.create(editor._tiptapEditor.state.doc, 0, i),
      ),
    );

    const blockNoteSelection = editor.getSelectionCutBlocks();
    const JSONString = JSON.stringify(blockNoteSelection);

    ret += JSONString + "\n";
  }

  await expect(ret).toMatchFileSnapshot(
    `./__snapshots__/end/${testCase.name}.txt`,
  );
};
