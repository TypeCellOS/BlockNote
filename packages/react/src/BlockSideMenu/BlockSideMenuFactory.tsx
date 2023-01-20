import {
  BlockSideMenu,
  BlockSideMenuDynamicParams,
  BlockSideMenuFactory,
  BlockSideMenuStaticParams,
} from "@blocknote/core";
import { BlockSideMenu as ReactBlockSideMenu } from "./components/BlockSideMenu";
import { ReactEditorElementFactory } from "../EditorElementFactory";

export const ReactBlockSideMenuFactory: BlockSideMenuFactory = (
  staticParams
): BlockSideMenu =>
  ReactEditorElementFactory<
    BlockSideMenuStaticParams,
    BlockSideMenuDynamicParams
  >(staticParams, ReactBlockSideMenu, {
    animation: "fade",
    offset: [0, 0],
    placement: "left",
  });
