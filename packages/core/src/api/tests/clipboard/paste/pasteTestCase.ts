import { Node } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";

import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";

export type PasteTestCase<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  name: string;
  content: string;
  document: PartialBlock<B, I, S>[];
  getPasteSelection: (pmDoc: Node) => Selection;
};
