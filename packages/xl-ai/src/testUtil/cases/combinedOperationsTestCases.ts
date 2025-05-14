import { BlockNoteEditor, getBlockInfo, getNodeById } from "@blocknote/core";
import { getEditorWithFormattingAndMentions } from "./editors/formattingAndMentions.js";
import { DocumentOperationTestCase } from "./index.js";

export const combinedOperationsTestCases: DocumentOperationTestCase[] = [
  {
    editor: getEditorWithFormattingAndMentions,
    description: "add and update paragraph",
    baseToolCalls: [
      {
        type: "add",
        blocks: [{ content: "You look great today!" }],
        referenceId: "ref1",
        position: "after",
      },
      {
        type: "update",
        id: "ref1",
        block: { content: "Hallo, wereld!" },
      },
    ],
    userPrompt:
      "add a new paragraph with the text 'You look great today!' after the first paragraph and translate 'Hello, world' to dutch",
  },
  {
    editor: getEditorWithFormattingAndMentions,
    description: "add paragraph and update selection",
    // Note: this test is important because it will validate whether the
    // positions of `getTestSelection` are mapped correctly after the first toolcall
    baseToolCalls: [
      {
        type: "add",
        blocks: [{ content: "You look great today!" }],
        referenceId: "ref2",
        position: "before",
      },
      {
        type: "update",
        id: "ref2",
        block: {
          content: [{ type: "text", text: "Hallo", styles: {} }],
        },
      },
    ],
    getTestSelection: (editor: BlockNoteEditor<any, any, any>) => {
      const posInfo = getNodeById("ref2", editor.prosemirrorState.doc)!;
      const block = getBlockInfo(posInfo);
      if (!block.isBlockContainer) {
        throw new Error("Block is not a block container");
      }
      return {
        from: block.blockContent.beforePos + 1,
        to: block.blockContent.beforePos + 1 + "Hello".length,
      };
    },
    userPrompt:
      "add a paragraph with the text 'You look great today!' at the beginning and translate selection to German",
  },
];
