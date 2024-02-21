import {
  BlockColorsButton,
  DragHandleMenu,
  DragHandleMenuItem,
  DragHandleMenuProps,
  RemoveBlockButton,
  useBlockNoteEditor,
} from "@blocknote/react";
import "@blocknote/react/style.css";

export function CustomDragHandleMenu(props: DragHandleMenuProps) {
  const editor = useBlockNoteEditor();

  return (
    <DragHandleMenu {...props}>
      <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
      <BlockColorsButton {...props}>Colors</BlockColorsButton>
      {/*Custom item which opens an alert when clicked.*/}
      <DragHandleMenuItem
        onClick={() => {
          editor.updateBlock(props.block, { type: "paragraph" });
        }}>
        Reset Type
      </DragHandleMenuItem>
    </DragHandleMenu>
  );
}
