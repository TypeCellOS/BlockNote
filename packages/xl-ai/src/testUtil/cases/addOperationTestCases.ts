import { getEmptyEditor } from "./editors/emptyEditor.js";
import { getSimpleEditor } from "./editors/simpleEditor.js";
import { DocumentOperationTestCase } from "./index.js";

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
  {
    editor: getSimpleEditor,
    description: "Add heading (h1) and code block",
    baseToolCalls: [
      {
        type: "add",
        blocks: [
          { type: "heading", content: "Code", props: { level: 1 } },
          {
            type: "codeBlock",
            content: "console.log('hello world');",
            props: { language: "javascript" },
          },
        ],
        referenceId: "ref2",
        position: "after",
      },
    ],
    userPrompt:
      "at the end of doc, add a h1 heading `Code` and a javascript code block with `console.log('hello world');`",
  },
  // TODO: fix cursor block
  // {
  //   editor: getSimpleEditorWithCursorBetweenBlocks,
  //   description: "Add heading (based on cursor)",
  //   baseToolCalls: [
  //     {
  //       type: "add",
  //       blocks: [
  //         { type: "heading", content: "I love lamp", props: { level: 1 } },
  //       ],
  //       referenceId: "ref1",
  //       position: "after",
  //     },
  //   ],

  //   userPrompt:
  //     "at the end of doc, add a heading `Code` and a javascript code block with `console.log('hello world');`",
  // },
  {
    editor: getEmptyEditor,
    description: "add a new paragraph (empty doc)",
    baseToolCalls: [
      {
        type: "update",
        block: { content: "You look great today!" },
        id: "ref1",
      },
    ],
    userPrompt: `write a new paragraph with the text 'You look great today!'`,
  },
];
