import { DragHandleMenuItem } from "../DragHandleMenuItem";
import { BlockNoteEditor } from "@blocknote/core";
import { ReactNode } from "react";

export const RemoveBlockButton = (props: {
  editor: BlockNoteEditor;
  closeMenu: () => void;
  children: ReactNode;
}) => {
  const block = props.editor.getMouseCursorPosition()?.block;

  return (
    <DragHandleMenuItem
      editor={props.editor}
      closeMenu={props.closeMenu}
      onClick={() => block && props.editor.removeBlocks([block])}>
      {props.children}
    </DragHandleMenuItem>
  );
};
