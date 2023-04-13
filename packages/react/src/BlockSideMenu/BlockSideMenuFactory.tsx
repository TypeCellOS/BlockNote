import { FC } from "react";
import {
  BlockSideMenu,
  BlockSideMenuDynamicParams,
  BlockSideMenuFactory,
  BlockSideMenuStaticParams,
} from "@blocknote/core";
import { BlockSideMenu as ReactBlockSideMenu } from "./components/BlockSideMenu";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";
import { DragHandleMenuProps } from "./components/DragHandleMenu";

export const createReactBlockSideMenuFactory = (
  dragHandleMenu: FC<DragHandleMenuProps>
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

export const ReactBlockSideMenuFactory: BlockSideMenuFactory = (
  staticParams
): BlockSideMenu =>
  ReactElementFactory<BlockSideMenuStaticParams, BlockSideMenuDynamicParams>(
    staticParams,
    ReactBlockSideMenu,
    {
      animation: "fade",
      offset: [0, 0],
      placement: "left",
    }
  );
