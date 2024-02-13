import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  SideMenuData,
  StyleSchema,
} from "@blocknote/core";
import { useEffect, useState } from "react";
import { UiComponentData } from "../../../components-shared/UiComponentTypes";

export function useSideMenuData<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
): UiComponentData<SideMenuData<BSchema, I, S>, "sideMenu"> {
  const [block, setBlock] = useState<Block<BSchema, I, S>>();

  useEffect(() => {
    return editor.sideMenu.onDataUpdate((data) => {
      setBlock(data.block);
    });
  }, [editor]);

  return {
    block: block!,
    addBlock: editor.sideMenu.addBlock,
    blockDragStart: editor.sideMenu.blockDragStart,
    blockDragEnd: editor.sideMenu.blockDragEnd,
    freezeMenu: editor.sideMenu.freezeMenu,
    unfreezeMenu: editor.sideMenu.unfreezeMenu,
  };
}
