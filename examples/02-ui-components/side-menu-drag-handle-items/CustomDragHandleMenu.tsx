import {
  BlockColorsButton,
  DragHandleMenuItem,
  DragHandleMenuProps,
  DragHandleMenuWrapper,
  RemoveBlockButton,
} from "@blocknote/react";
import "@blocknote/react/style.css";

export function CustomDragHandleMenu(props: DragHandleMenuProps) {
  return (
    <DragHandleMenuWrapper {...props}>
      <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
      <BlockColorsButton {...props}>Colors</BlockColorsButton>
      {/*Custom item which opens an alert when clicked.*/}
      <DragHandleMenuItem onClick={() => window.alert("Button Pressed!")}>
        Open Alert
      </DragHandleMenuItem>
    </DragHandleMenuWrapper>
  );
}
