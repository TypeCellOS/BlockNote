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

  await expect(editor.getTextCursorPosition()).toMatchFileSnapshot(
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
    editor.transact((tr) => {
      return (
        tr.selection.$from.parentOffset ===
        tr.selection.$from.node().firstChild!.nodeSize
      );
    }),
  ).toBeTruthy();
};

export const testTextCursorPositionPoint = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: TextCursorPositionTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document);

  editor.setTextCursorPosition({ id: "target", offset: 1 });

  expect(
    editor.transact((tr) => tr.selection.$from.parentOffset) === 1,
  ).toBeTruthy();
};

export const testTextCursorPositionRange = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: TextCursorPositionTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document);

  // Get the range configuration from the test case
  const rangeConfig = (testCase as any).rangeConfig;
  if (!rangeConfig) {
    throw new Error("Range test case must include rangeConfig");
  }

  editor.setTextCursorPosition(rangeConfig);

  // Capture the actual selection values for snapshot testing
  const selectionSnapshot = editor.transact((tr) => ({
    from: {
      parentOffset: tr.selection.$from.parentOffset,
      pos: tr.selection.$from.pos,
      node: tr.selection.$from.node().textContent,
    },
    to: {
      parentOffset: tr.selection.$to.parentOffset,
      pos: tr.selection.$to.pos,
      node: tr.selection.$to.node().textContent,
    },
  }));

  await expect(selectionSnapshot).toMatchFileSnapshot(
    `./__snapshots__/${testCase.name}.json`,
  );
};
