import { FC } from "react";
import {
  BlockSideMenuDynamicParams,
  BlockSideMenuStaticParams,
} from "@blocknote/core";
import { BlockSideMenu as ReactBlockSideMenu } from "./components/BlockSideMenu";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";
import { DragHandleMenuProps } from "./components/DragHandleMenu";
import { DefaultDragHandleMenu } from "./components/DefaultDragHandleMenu";

export const createReactBlockSideMenuFactory = (
  dragHandleMenu: FC<DragHandleMenuProps> = DefaultDragHandleMenu
) => {
  const CustomDragHandleMenu = dragHandleMenu;
  const CustomBlockSideMenu = (
    props: BlockSideMenuStaticParams & BlockSideMenuDynamicParams
  ) => <ReactBlockSideMenu {...props} dragHandleMenu={CustomDragHandleMenu} />;

  return (staticParams: BlockSideMenuStaticParams) =>
    ReactElementFactory<BlockSideMenuStaticParams, BlockSideMenuDynamicParams>(
      staticParams,
      CustomBlockSideMenu,
      {
        animation: "fade",
        offset: [0, 0],
        placement: "left",
      }
    );
};
