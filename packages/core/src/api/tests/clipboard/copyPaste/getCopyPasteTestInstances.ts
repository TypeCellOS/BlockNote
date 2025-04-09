import { TextSelection } from "@tiptap/pm/state";

import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { TestInstance } from "../../types.js";
import { getPosOfTextNode } from "../clipboardTestUtil.js";
import { CopyPasteTestCase } from "./copyPasteTestCase.js";
import { testCopyPaste } from "./copyPasteTestExecutors.js";

export const getCopyPasteTestInstances = (): TestInstance<
  CopyPasteTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] => [
  {
    testCase: {
      name: "paragraphInCustomBlock",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
        {
          type: "customParagraph",
          content: "Custom Paragraph 1",
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Paragraph 1", true);

        return TextSelection.create(doc, startPos, endPos);
      },
      getPasteSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Custom Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Custom Paragraph 1", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyPaste,
  },
];
