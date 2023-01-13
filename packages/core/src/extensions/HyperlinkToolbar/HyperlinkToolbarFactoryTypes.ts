import { EditorElement, ElementFactory } from "../../shared/EditorElement";

export type HyperlinkToolbarParams = {
  url: string;
  text: string;
  editHyperlink: (url: string, text: string) => void;
  deleteHyperlink: () => void;

  boundingBox: DOMRect;
  editorElement: Element;
};

export type HyperlinkToolbar = EditorElement<HyperlinkToolbarParams>;
export type HyperlinkToolbarFactory = ElementFactory<HyperlinkToolbarParams>;
