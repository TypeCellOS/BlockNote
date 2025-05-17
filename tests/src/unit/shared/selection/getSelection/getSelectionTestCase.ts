import {
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "@blocknote/core";
import { Node } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";

export type GetSelectionTestCase<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = {
  name: string;
  document: PartialBlock<B, I, S>[];
  getSelection: (pmDoc: Node) => Selection;
};
