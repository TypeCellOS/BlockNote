import { TextSelection } from "@tiptap/pm/state";

import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { PasteTestCase } from "../../../shared/clipboard/paste/pasteTestCase.js";
import {
  testPasteHTML,
  testPasteMarkdown,
} from "../../../shared/clipboard/paste/pasteTestExecutors.js";
import { TestInstance } from "../../../types.js";
import { getPosOfTextNode } from "../clipboardTestUtil.js";

export const getPasteTestInstances = (): TestInstance<
  PasteTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] => [
  {
    testCase: {
      name: "pasteEndOfParagraph",
      content: `<p>Paragraph</p>`,
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
      ],
      getPasteSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1", true);

        return TextSelection.create(doc, startPos);
      },
    },
    executeTest: testPasteHTML,
  },
  {
    testCase: {
      name: "pasteEndOfParagraphText",
      content: `Paragraph`,
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
      ],
      getPasteSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1", true);

        return TextSelection.create(doc, startPos);
      },
    },
    executeTest: testPasteMarkdown,
  },
  {
    testCase: {
      name: "pasteImage",
      content: `<img src="exampleURL">`,
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
      ],
      getPasteSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1", true);

        return TextSelection.create(doc, startPos);
      },
    },
    executeTest: testPasteHTML,
  },
  {
    testCase: {
      name: "pasteTable",
      content: `<table>
  <tr>
    <td>Cell 1</td>
    <td>Cell 2</td>
  </tr>
  <tr>
    <td>Cell 3</td>
    <td>Cell 4</td>
  </tr>
</table>`,
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
      ],
      getPasteSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1", true);

        return TextSelection.create(doc, startPos);
      },
    },
    executeTest: testPasteHTML,
  },
  {
    testCase: {
      name: "pasteTableInExistingTable",
      content: `<table>
  <tr>
    <td>Cell 1</td>
    <td>Cell 2</td>
  </tr>
  <tr>
    <td>Cell 3</td>
    <td>Cell 4</td>
  </tr>
</table>`,
      document: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["Table Cell 1"], ["Table Cell 2"]],
              },
              {
                cells: [["Table Cell 3"], ["Table Cell 4"]],
              },
            ],
          },
        },
      ],
      getPasteSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Table Cell 4", true);

        return TextSelection.create(doc, startPos);
      },
    },
    executeTest: testPasteHTML,
  },
  {
    testCase: {
      name: "pasteParagraphInCustomBlock",
      content: `<p>Paragraph</p>`,
      document: [
        {
          type: "customParagraph",
          content: "Custom Paragraph 1",
        },
      ],
      getPasteSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Custom Paragraph 1", true);

        return TextSelection.create(doc, startPos);
      },
    },
    executeTest: testPasteHTML,
  },
];
