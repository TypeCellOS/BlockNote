import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { DragHandleMenuProps } from "./DragHandleMenuProps";
import { DragHandleMenuWrapper } from "./DragHandleMenuWrapper";
import { BlockColorsButton } from "./DefaultButtons/BlockColorsButton";
import { RemoveBlockButton } from "./DefaultButtons/RemoveBlockButton";

export const DragHandleMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: DragHandleMenuProps<BSchema, I, S>
) => (
  <DragHandleMenuWrapper>
    <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
    <BlockColorsButton {...props}>Colors</BlockColorsButton>
  </DragHandleMenuWrapper>
);
