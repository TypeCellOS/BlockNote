import { ReactNode } from "react";
import { BlockSchema } from "@blocknote/core";

import { DragHandleMenuProps } from "../DragHandleMenu";
import { DragHandleMenuItem } from "../DragHandleMenuItem";

export const RemoveBlockButton = <BSchema extends BlockSchema>(
  props: DragHandleMenuProps<BSchema> & { children: ReactNode }
) => {
  return (
    <DragHandleMenuItem
      closeMenu={props.closeMenu}
      onClick={() => props.editor.removeBlocks([props.block])}>
      {props.children}
    </DragHandleMenuItem>
  );
};
