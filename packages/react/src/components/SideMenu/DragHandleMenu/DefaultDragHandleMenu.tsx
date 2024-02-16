import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { BlockColorsButton } from "./DefaultButtons/BlockColorsButton";
import { RemoveBlockButton } from "./DefaultButtons/RemoveBlockButton";
import { DragHandleMenu, DragHandleMenuProps } from "./DragHandleMenu";

export const DefaultDragHandleMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: DragHandleMenuProps<BSchema, I, S>
) => (
  <DragHandleMenu>
    <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
    <BlockColorsButton {...props}>Colors</BlockColorsButton>
  </DragHandleMenu>
);
