import { NodeSelection, TextSelection } from "@tiptap/pm/state";

import { CopyTestCase } from "../../../shared/clipboard/copy/copyTestCase.js";
import { testCopyHTML } from "../../../shared/clipboard/copy/copyTestExecutors.js";
import { getPosOfTextNode } from "../../../shared/testUtil.js";
import { TestInstance } from "../../../types.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";

export const copyTestInstancesHTML: TestInstance<
  CopyTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: {
      name: "mathBlock",
      document: [
        {
          type: "math",
          content: "a^2 + b^2 = c^2",
        },
      ],
      getCopySelection: (doc) => {
        let startPos: number | undefined = undefined;

        doc.descendants((node, pos) => {
          if (node.type.name === "math") {
            startPos = pos;
          }
        });

        if (startPos === undefined) {
          throw new Error("Math node not found.");
        }

        return NodeSelection.create(doc, startPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "inlineMath",
      document: [
        {
          type: "paragraph",
          content: [
            "The identity ",
            {
              type: "inlineMath",
              content: "e^{i\\pi} + 1 = 0",
            } as const,
            " is elegant.",
          ],
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "The identity ");
        const endPos = getPosOfTextNode(doc, " is elegant.", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
];
