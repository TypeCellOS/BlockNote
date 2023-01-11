import { EditorElement, ElementFactory } from "../../shared/EditorElement";

export type HyperlinkMenuParams = {
  url: string;
  text: string;
  editHyperlink: (url: string, text: string) => void;
  deleteHyperlink: () => void;

  boundingBox: DOMRect;
  editorElement: Element;
};

export type HyperlinkMenu = EditorElement<HyperlinkMenuParams>;
export type HyperlinkMenuFactory = ElementFactory<HyperlinkMenuParams>;
