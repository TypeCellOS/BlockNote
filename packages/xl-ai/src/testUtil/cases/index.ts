import {
  BlockNoteEditor,
  type BlockNoteEditorOptions,
  expandPMRangeToWords,
  getNodeById,
  PartialBlock,
  updateBlockTr,
} from "@blocknote/core";
import { AddBlocksToolCall } from "../../api/formats/base-tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../../api/formats/base-tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "../../api/formats/base-tools/delete.js";
import { isEmptyParagraph } from "../../util/emptyBlock.js";
import { getTestOptionsHost } from "../testOptions.js";
import type { schemaWithMention } from "./schemas/mention.js";

// Both test environments support creating these headless editors. The
// browser fixture needs `mountType: false` to avoid mounting a React view.
type MentionEditor = typeof schemaWithMention.BlockNoteEditor;
type HeadlessOptions<E> =
  E extends BlockNoteEditor<infer B, infer I, infer S>
    ? Partial<BlockNoteEditorOptions<B, I, S>> & { mountType: false }
    : never;

export type SetupTestEditor = {
  (
    options: HeadlessOptions<MentionEditor> & {
      schema: typeof schemaWithMention;
    },
  ): Promise<{ editor: MentionEditor }>;
  (options: Omit<HeadlessOptions<BlockNoteEditor>, "schema">): Promise<{
    editor: BlockNoteEditor;
  }>;
};

export type DocumentOperationTestCase = {
  /**
   * The editor to apply the update to
   */
  editor: (
    setupEditor: SetupTestEditor,
  ) => Promise<BlockNoteEditor<any, any, any>>;
  /**
   * The toolcalls to apply to the editor
   */
  baseToolCalls: Array<
    | UpdateBlockToolCall<PartialBlock<any, any, any>>
    | AddBlocksToolCall<PartialBlock<any, any, any>>
    | DeleteBlockToolCall
  >;
  /**
   * If provided, this function will be used to get the selection to use for the test.
   */
  getTestSelection?: (editor: BlockNoteEditor<any, any, any>) => {
    from: number;
    to: number;
  };
  /**
   * Description (name) of the test case
   */
  description: string;
  /**
   * For LLM tests, this is a prompt that can be given that should also result in the same update.
   *
   * Note: the test cases in this file focus on formatting, so the prompts might not be very realistic,
   * the goal of these tests is to test whether LLMs can make certain updates technically, not to test
   * the quality of the prompt understanding, etc. (should be in different tests)
   */
  userPrompt: string;
};

export async function getExpectedEditor(
  setupEditor: SetupTestEditor,
  testCase: DocumentOperationTestCase,
  opts: {
    deleteEmptyCursorBlock: boolean;
  } = {
    deleteEmptyCursorBlock: false,
  },
) {
  const testOptions = getTestOptionsHost().__TEST_OPTIONS;
  if (testOptions) {
    delete testOptions.mockID;
  }

  const editor = await testCase.editor(setupEditor);

  const cursorBlock = testCase.getTestSelection
    ? undefined
    : editor.getTextCursorPosition().block;

  const deleteCursorBlock: string | undefined =
    cursorBlock &&
    opts.deleteEmptyCursorBlock &&
    isEmptyParagraph(cursorBlock) &&
    editor.document.length > 1
      ? cursorBlock.id
      : undefined;

  if (deleteCursorBlock) {
    editor.removeBlocks([deleteCursorBlock]);
  }

  for (const toolCall of testCase.baseToolCalls) {
    if (toolCall.type === "update") {
      const selection = testCase.getTestSelection?.(editor);
      if (selection) {
        const { from, to } = selection;
        editor.transact((tr) => {
          const range = expandPMRangeToWords(tr.doc, {
            $from: tr.doc.resolve(from),
            $to: tr.doc.resolve(to),
          });
          const pos = getNodeById(toolCall.id, tr.doc)!;
          // this is a bit of an ugly internal API, do we want to expose this (updating a selection)
          // to the user-facing API?
          updateBlockTr(
            tr,
            pos.posBeforeNode,
            toolCall.block,
            range.from,
            range.to,
          );
        });
      } else {
        editor.updateBlock(toolCall.id, toolCall.block);
      }
    } else if (toolCall.type === "add") {
      editor.insertBlocks(
        toolCall.blocks,
        toolCall.referenceId,
        toolCall.position,
      );
    } else if (toolCall.type === "delete") {
      editor.removeBlocks([toolCall.id]);
    }
  }
  return editor;
}
