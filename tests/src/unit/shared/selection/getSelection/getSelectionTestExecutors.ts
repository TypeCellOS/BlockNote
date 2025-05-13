import { expect } from "vitest";
import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { GetSelectionTestCase } from "./getSelectionTestCase.js";
import { initTestEditor } from "../../testUtil.js";

export const testGetSelection = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: GetSelectionTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document, testCase.getSelection);

  const blockNoteSelection = editor.getSelectionCutBlocks();

  await expect(
    JSON.stringify(blockNoteSelection, undefined, 2),
  ).toMatchFileSnapshot(
    `./__snapshots__/blocknote/selection/${testCase.name}.json`,
  );
};

export const testGetSelectionCutBlocks = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: GetSelectionTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document, testCase.getSelection);

  const blockNoteSelection = editor.getSelectionCutBlocks();

  await expect(
    JSON.stringify(blockNoteSelection, undefined, 2),
  ).toMatchFileSnapshot(
    `./__snapshots__/blocknote/selection/${testCase.name}.json`,
  );
};
