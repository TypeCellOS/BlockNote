import { FC } from "react";
import {
  BlockNoteEditor,
  BlockSchema,
  BlockSideMenu,
  BlockSideMenuDynamicParams,
  BlockSideMenuStaticParams,
} from "@blocknote/core";
import { BlockSideMenu as ReactBlockSideMenu } from "./components/BlockSideMenu";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";

export const createReactBlockSideMenuFactory = <BSchema extends BlockSchema>(
  dragHandleMenu: FC<{
    editor: BlockNoteEditor<BSchema>;
    closeMenu: () => void;
  }>
) => {
  const CustomDragHandleMenu = dragHandleMenu;
  const CustomBlockSideMenu = (
    props: BlockSideMenuStaticParams<BSchema> &
      BlockSideMenuDynamicParams<BSchema>
  ) => <ReactBlockSideMenu {...props} dragHandleMenu={CustomDragHandleMenu} />;

  return (staticParams: BlockSideMenuStaticParams<BSchema>) =>
    ReactElementFactory<
      BlockSideMenuStaticParams<BSchema>,
      BlockSideMenuDynamicParams<BSchema>
    >(staticParams, CustomBlockSideMenu, {
      animation: "fade",
      offset: [0, 0],
      placement: "left",
    });
};

export const ReactBlockSideMenuFactory = <BSchema extends BlockSchema>(
  staticParams: BlockSideMenuStaticParams<BSchema>
): BlockSideMenu<BSchema> =>
  ReactElementFactory<
    BlockSideMenuStaticParams<BSchema>,
    BlockSideMenuDynamicParams<BSchema>
  >(staticParams, ReactBlockSideMenu, {
    animation: "fade",
    offset: [0, 0],
    placement: "left",
  });
