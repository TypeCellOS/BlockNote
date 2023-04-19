import { DragHandleMenu, DragHandleMenuProps } from "./DragHandleMenu";
import { RemoveBlockButton } from "./DefaultButtons/RemoveBlockButton";
import { BlockColorsButton } from "./DefaultButtons/BlockColorsButton";

export const DefaultDragHandleMenu = (props: DragHandleMenuProps) => (
  <DragHandleMenu>
    <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
    <BlockColorsButton {...props}>Colors</BlockColorsButton>
  </DragHandleMenu>
);
