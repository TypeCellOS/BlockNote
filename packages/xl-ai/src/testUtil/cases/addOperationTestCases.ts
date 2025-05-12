import { getSimpleEditor } from "./editors/simpleEditor.js";
import { DocumentOperationTestCase } from "./types.js";

export const addOperationTestCases: DocumentOperationTestCase[] = [
  {
    editor: getSimpleEditor,
    description: "add a new paragraph (start)",
    baseToolCalls: [
      {
        type: "add",
        blocks: [{ content: "You look great today!" }],
        referenceId: "ref1",
        position: "before",
      },
    ],
    userPrompt:
      "add a new paragraph with the text 'You look great today!' before the first sentence",
  },
  {
    editor: getSimpleEditor,
    description: "add a new paragraph (end)",
    baseToolCalls: [
      {
        type: "add",
        blocks: [{ content: "You look great today!" }],
        referenceId: "ref2",
        position: "after",
      },
    ],
    userPrompt:
      "add a new paragraph with the text 'You look great today!' after the last sentence",
  },
  {
    editor: getSimpleEditor,
    description: "add a list (end)",
    baseToolCalls: [
      {
        type: "add",
        blocks: [
          { type: "bulletListItem", content: "Apples" },
          { type: "bulletListItem", content: "Bananas" },
        ],
        referenceId: "ref2",
        position: "after",
      },
    ],
    userPrompt:
      "add a list with the items 'Apples' and 'Bananas' after the last sentence",
  },
];
