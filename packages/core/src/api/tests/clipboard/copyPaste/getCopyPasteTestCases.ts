import { Node } from "@tiptap/pm/model";
import { Selection, TextSelection } from "@tiptap/pm/state";

import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { getPosOfTextNode } from "../clipboardTestUtil.js";

export type CopyPasteTestCase<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  name: string;
  document: PartialBlock<B, I, S>[];
  getCopySelection: (pmDoc: Node) => Selection;
  getPasteSelection: (pmDoc: Node) => Selection;
};

export const getCopyPasteTestCases = (): CopyPasteTestCase<
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] => [
  {
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
];
