import { ReactNode } from "react";

import { DragHandleMenuProps } from "../DragHandleMenu";
import { DragHandleMenuItem } from "../DragHandleMenuItem";

export const RemoveBlockButton = (
  props: DragHandleMenuProps & { children: ReactNode }
) => {
  return (
    <DragHandleMenuItem
      closeMenu={props.closeMenu}
      onClick={() => props.editor.removeBlocks([props.block])}>
      {props.children}
    </DragHandleMenuItem>
  );
};
