import { BlockNoteEditor } from "@blocknote/core";
import { DragHandleMenu } from "./DragHandleMenu";
import { RemoveBlockButton } from "./DefaultButtons/RemoveBlockButton";
import { BlockColorsButton } from "./DefaultButtons/BlockColorsButton";

export const DefaultDragHandleMenu = (props: {
  editor: BlockNoteEditor;
  closeMenu: () => void;
}) => (
  <DragHandleMenu>
    <RemoveBlockButton editor={props.editor} closeMenu={props.closeMenu}>
      Delete
    </RemoveBlockButton>
    <BlockColorsButton editor={props.editor} closeMenu={props.closeMenu}>
      Colors
    </BlockColorsButton>
  </DragHandleMenu>
);
