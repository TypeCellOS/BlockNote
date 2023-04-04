import {
  DragHandleMenuItem,
  DragHandleMenuItemProps,
} from "../DragHandleMenuItem";

export const RemoveBlockButton = (props: DragHandleMenuItemProps) => {
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
