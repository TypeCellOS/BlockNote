import {
  BlockNoteEditor,
  getNodeById,
  PartialBlock,
  updateBlockTr,
} from "@blocknote/core";
import { AddBlocksToolCall } from "../../api/formats/base-tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../../api/formats/base-tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "../../api/formats/base-tools/delete.js";
import { isEmptyParagraph } from "../../util/emptyBlock.js";

export type DocumentOperationTestCase = {
  /**
   * The editor to apply the update to
   */
  editor: () => BlockNoteEditor<any, any, any>;
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
  /**
   * The capabilities that are required to perform the update.
   * If the LLM does not have these capabilities, the test will be skipped.
   */
  requiredCapabilities?: {
    mentions?: boolean;
    textAlignment?: boolean;
    blockColor?: boolean;
  };
};

export function getExpectedEditor(
  testCase: DocumentOperationTestCase,
  opts: {
    deleteEmptyCursorBlock: boolean;
  } = {
    deleteEmptyCursorBlock: false,
  },
) {
  (window as any).__TEST_OPTIONS.mockID = undefined;

  const editor = testCase.editor();

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
        editor.transact((tr) => {
          const pos = getNodeById(toolCall.id, tr.doc)!;
          // this is a bit of an ugly internal API, do we want to expose this (updating a selection)
          // to the user-facing API?
          updateBlockTr(
            tr,
            pos.posBeforeNode,
            toolCall.block,
            selection?.from,
            selection?.to,
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
