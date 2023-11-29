import { BlockSchema } from "@blocknote/core";

import { BlockColorsButton } from "./DefaultButtons/BlockColorsButton";
import { RemoveBlockButton } from "./DefaultButtons/RemoveBlockButton";
import { DragHandleMenu, DragHandleMenuProps } from "./DragHandleMenu";

export const DefaultDragHandleMenu = <BSchema extends BlockSchema>(
  props: DragHandleMenuProps<BSchema, any, any>
) => (
  <DragHandleMenu>
    <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
    <BlockColorsButton {...props}>Colors</BlockColorsButton>
  </DragHandleMenu>
);
