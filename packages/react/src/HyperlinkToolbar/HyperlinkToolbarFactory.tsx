import {
  HyperlinkToolbar,
  HyperlinkToolbarDynamicParams,
  HyperlinkToolbarFactory,
  HyperlinkToolbarStaticParams,
} from "@blocknote/core";
import { HyperlinkToolbar as ReactHyperlinkToolbar } from "./components/HyperlinkToolbar";
import { ReactEditorElementFactory } from "../EditorElementFactory";

export const ReactHyperlinkToolbarFactory: HyperlinkToolbarFactory = (
  staticParams
): HyperlinkToolbar =>
  ReactEditorElementFactory<
    HyperlinkToolbarStaticParams,
    HyperlinkToolbarDynamicParams
  >(staticParams, ReactHyperlinkToolbar, {
    animation: "fade",
    placement: "top",
  });
