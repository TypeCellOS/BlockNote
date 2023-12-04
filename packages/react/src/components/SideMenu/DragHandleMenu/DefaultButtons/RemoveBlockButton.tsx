import { BlockSchema } from "@blocknote/core";
import { ReactNode } from "react";

import type { DragHandleMenuProps } from "../DragHandleMenu";
import { DragHandleMenuItem } from "../DragHandleMenuItem";

export const RemoveBlockButton = <BSchema extends BlockSchema>(
  props: DragHandleMenuProps<BSchema, any, any> & { children: ReactNode }
) => {
  return (
    <DragHandleMenuItem
      onClick={() => props.editor.removeBlocks([props.block])}>
      {props.children}
    </DragHandleMenuItem>
  );
};
