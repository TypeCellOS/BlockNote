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
          type: "mathBlock",
          content: "a^2 + b^2 = c^2",
        },
      ],
      getCopySelection: (doc) => {
        let startPos: number | undefined = undefined;

        doc.descendants((node, pos) => {
          if (node.type.name === "mathBlock") {
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
      name: "math",
      document: [
        {
          type: "paragraph",
          content: [
            "The identity ",
            {
              type: "math",
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
