import {
  BlockSideMenu,
  BlockSideMenuDynamicParams,
  BlockSideMenuFactory,
  BlockSideMenuStaticParams,
} from "@blocknote/core";
import { BlockSideMenu as ReactBlockSideMenu } from "./components/BlockSideMenu";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";

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
