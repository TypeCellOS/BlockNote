import { EditorElement, ElementFactory } from "../../shared/EditorElement";

export type HyperlinkToolbarStaticParams = {
  editHyperlink: (url: string, text: string) => void;
  deleteHyperlink: () => void;

  getReferenceRect: () => DOMRect;
};

export type HyperlinkToolbarDynamicParams = {
  url: string;
  text: string;
};

export type HyperlinkToolbar = EditorElement<HyperlinkToolbarDynamicParams>;
export type HyperlinkToolbarFactory = ElementFactory<
  HyperlinkToolbarStaticParams,
  HyperlinkToolbarDynamicParams
>;
