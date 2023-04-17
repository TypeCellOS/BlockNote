import {
  HyperlinkToolbar,
  HyperlinkToolbarDynamicParams,
  HyperlinkToolbarFactory,
  HyperlinkToolbarStaticParams,
} from "@blocknote/core";
import { HyperlinkToolbar as ReactHyperlinkToolbar } from "./components/HyperlinkToolbar";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";

export const createReactHyperlinkToolbarFactory =
  (useDarkTheme?: boolean): HyperlinkToolbarFactory =>
  (staticParams): HyperlinkToolbar =>
    ReactElementFactory<
      HyperlinkToolbarStaticParams,
      HyperlinkToolbarDynamicParams
    >(staticParams, ReactHyperlinkToolbar, useDarkTheme, {
      animation: "fade",
      placement: "top-start",
    });
