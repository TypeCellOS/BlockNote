import { FC } from "react";
import {
  BlockSchema,
  BlockSideMenuDynamicParams,
  BlockSideMenuStaticParams,
} from "@blocknote/core";
import { MantineThemeOverride } from "@mantine/core";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";
import { BlockSideMenu as ReactBlockSideMenu } from "./components/BlockSideMenu";
import { DragHandleMenuProps } from "./components/DragHandleMenu";
import { DefaultDragHandleMenu } from "./components/DefaultDragHandleMenu";

export const createReactBlockSideMenuFactory = <BSchema extends BlockSchema>(
  theme: MantineThemeOverride,
  dragHandleMenu: FC<DragHandleMenuProps> = DefaultDragHandleMenu
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

