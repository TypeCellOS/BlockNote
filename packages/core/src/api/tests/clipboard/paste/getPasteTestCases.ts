import { Node } from "@tiptap/pm/model";
import { Selection, TextSelection } from "@tiptap/pm/state";

import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { getPosOfTextNode } from "../clipboardTestUtil.js";

export type PasteTestCase = {
  name: string;
  clipboardDataType: "text/html" | "text/markdown" | "text/plain";
  content: string;
  document: PartialBlock<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >[];
  getPasteSelection: (pmDoc: Node) => Selection;
};

export const getPasteTestCases = (): PasteTestCase[] => [
  {
    name: "pasteEndOfParagraph",
    clipboardDataType: "text/html",
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
  {
    name: "pasteEndOfParagraphText",
    clipboardDataType: "text/plain",
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
  {
    name: "pasteImage",
    clipboardDataType: "text/html",
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
  {
    name: "pasteTable",
    clipboardDataType: "text/html",
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
  {
    name: "pasteTableInExistingTable",
    clipboardDataType: "text/html",
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
  {
    name: "pasteParagraphInCustomBlock",
    clipboardDataType: "text/html",
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
];
