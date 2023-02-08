import { EditorElement, ElementFactory } from "../../shared/EditorElement";

export type HyperlinkToolbarStaticParams = {
  editHyperlink: (url: string, text: string) => void;
  deleteHyperlink: () => void;
};

export type HyperlinkToolbarDynamicParams = {
  url: string;
  text: string;

  referenceRect: DOMRect;
};

export type HyperlinkToolbar = EditorElement<HyperlinkToolbarDynamicParams>;
export type HyperlinkToolbarFactory = ElementFactory<
  HyperlinkToolbarStaticParams,
  HyperlinkToolbarDynamicParams
>;
