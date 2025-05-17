import { getEditorWithFormattingAndMentions } from "./editors/formattingAndMentions.js";
import { DocumentOperationTestCase } from "./index.js";

export const deleteOperationTestCases: DocumentOperationTestCase[] = [
  {
    editor: getEditorWithFormattingAndMentions,
    description: "delete first block",
    baseToolCalls: [
      {
        type: "delete",
        id: "ref1",
      },
    ],
    userPrompt: "delete the first paragraph",
  },
];
