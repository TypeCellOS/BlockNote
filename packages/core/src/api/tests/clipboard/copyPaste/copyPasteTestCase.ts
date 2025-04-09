import { Node } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";

import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";

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
