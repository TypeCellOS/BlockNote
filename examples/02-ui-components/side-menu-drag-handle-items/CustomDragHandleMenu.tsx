import {
  BlockColorsButton,
  DragHandleMenu,
  DragHandleMenuItem,
  DragHandleMenuProps,
  RemoveBlockButton,
} from "@blocknote/react";
import "@blocknote/react/style.css";

export const CustomDragHandleMenu = (
  props: DragHandleMenuProps<any, any, any>
) => {
  return (
    <DragHandleMenu>
      <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
      <BlockColorsButton {...props}>Colors</BlockColorsButton>
      {/*Custom item which opens an alert when clicked.*/}
      <DragHandleMenuItem onClick={() => window.alert("Button Pressed!")}>
        Open Alert
      </DragHandleMenuItem>
    </DragHandleMenu>
  );
};
