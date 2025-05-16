import {
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "@blocknote/core";
import { Node } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";

export type PasteTestCase<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = {
  name: string;
  content: string;
  document: PartialBlock<B, I, S>[];
  getPasteSelection: (pmDoc: Node) => Selection;
};
