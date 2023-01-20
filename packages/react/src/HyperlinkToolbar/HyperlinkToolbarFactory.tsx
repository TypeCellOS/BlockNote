import {
  HyperlinkToolbar,
  HyperlinkToolbarDynamicParams,
  HyperlinkToolbarFactory,
  HyperlinkToolbarStaticParams,
} from "@blocknote/core";
import { HyperlinkToolbar as ReactHyperlinkToolbar } from "./components/HyperlinkToolbar";
import { ElementFactory as ReactElementFactory } from "../ElementFactory";

export const ReactHyperlinkToolbarFactory: HyperlinkToolbarFactory = (
  staticParams
): HyperlinkToolbar =>
  ReactElementFactory<
    HyperlinkToolbarStaticParams,
    HyperlinkToolbarDynamicParams
  >(staticParams, ReactHyperlinkToolbar, {
    animation: "fade",
    placement: "top",
  });
