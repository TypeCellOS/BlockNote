import { Node } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";

import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { getCopyTestCases } from "../copy/getCopyTestCases.js";

export type CopyPasteEqualityTestCase = {
  name: string;
  document: PartialBlock<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >[];
  getCopyAndPasteSelection: (pmDoc: Node) => Selection;
};

export const getCopyPasteEqualityTestCases = (): CopyPasteEqualityTestCase[] =>
  getCopyTestCases().map(({ name, document, getCopySelection }) => ({
    name,
    document,
    getCopyAndPasteSelection: getCopySelection,
  }));
