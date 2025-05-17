import { expect } from "vitest";
import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { TextCursorPositionTestCase } from "./textCursorPositionTestCase.js";
import { initTestEditor } from "../../testUtil.js";

export const testTextCursorPositionSetAndGet = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: TextCursorPositionTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document);

  editor.setTextCursorPosition("target");

  expect(editor.getTextCursorPosition()).toMatchFileSnapshot(
    `./__snapshots__/${testCase.name}.json`,
  );
};

export const testTextCursorPositionStart = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: TextCursorPositionTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document);

  editor.setTextCursorPosition("target");

  expect(
    editor.transact((tr) => tr.selection.$from.parentOffset) === 0,
  ).toBeTruthy();
};

export const testTextCursorPositionEnd = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: TextCursorPositionTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document);

  editor.setTextCursorPosition("target", "end");

  expect(
    editor.transact((tr) => tr.selection.$from.parentOffset) ===
      editor.transact((tr) => tr.selection.$from.node().firstChild!.nodeSize),
  ).toBeTruthy();
};
