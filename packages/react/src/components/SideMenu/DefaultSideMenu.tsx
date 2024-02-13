import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
} from "@blocknote/core";

import { StyleSchema } from "@blocknote/core";
import { AddBlockButton } from "./DefaultButtons/AddBlockButton";
import { DragHandle } from "./DefaultButtons/DragHandle";
import { SideMenu } from "./SideMenu";
import { useSideMenuData } from "./hooks/useSideMenuData";
import { FC } from "react";
import type { DragHandleMenuProps } from "./DragHandleMenu/DragHandleMenu";

export const DefaultSideMenu = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  dragHandleMenu?: FC<DragHandleMenuProps<BSchema, I, S>>;
}) => {
  const {
    block,
    addBlock,
    blockDragStart,
    blockDragEnd,
    freezeMenu,
    unfreezeMenu,
  } = useSideMenuData(props.editor);

  return (
    <SideMenu>
      <AddBlockButton addBlock={addBlock} />
      <DragHandle
        editor={props.editor}
        block={block}
        blockDragStart={blockDragStart}
        blockDragEnd={blockDragEnd}
        freezeMenu={freezeMenu}
        unfreezeMenu={unfreezeMenu}
        dragHandleMenu={props.dragHandleMenu}
      />
    </SideMenu>
  );
};
