import {
  HyperlinkToolbar,
  HyperlinkToolbarDynamicParams,
  HyperlinkToolbarStaticParams,
  BlockNoteEditor,
} from "@blocknote/core";
import { HyperlinkToolbar as ReactHyperlinkToolbar } from "./components/HyperlinkToolbar";
import { ReactElementFactory } from "../ElementFactory/components/ReactElementFactory";

export const ReactHyperlinkToolbarFactory =
  (editorRef: React.MutableRefObject<BlockNoteEditor | null>) =>
  (staticParams: any): HyperlinkToolbar =>
    ReactElementFactory<
      HyperlinkToolbarStaticParams,
      HyperlinkToolbarDynamicParams
    >(
      staticParams,
      ReactHyperlinkToolbar,
      {
        animation: "fade",
        placement: "top-start",
      },
      editorRef
    );
