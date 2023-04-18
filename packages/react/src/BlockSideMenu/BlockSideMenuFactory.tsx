import {
  BlockSideMenu,
  BlockSideMenuDynamicParams,
  BlockSideMenuFactory,
  BlockSideMenuStaticParams,
} from "@blocknote/core";
import { BlockSideMenu as ReactBlockSideMenu } from "./components/BlockSideMenu";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";
import { MantineThemeOverride } from "@mantine/core";

export const createReactBlockSideMenuFactory =
  (theme: MantineThemeOverride): BlockSideMenuFactory =>
  (staticParams): BlockSideMenu =>
    ReactElementFactory<BlockSideMenuStaticParams, BlockSideMenuDynamicParams>(
      staticParams,
      ReactBlockSideMenu,
      theme,
      {
        animation: "fade",
        offset: [0, 0],
        placement: "left",
      }
    );
