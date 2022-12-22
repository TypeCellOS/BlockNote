import { Menu, MenuFactory } from "../types";

export type HyperlinkHoverMenuParams = {
  hyperlinkUrl: string;
  hyperlinkText: string;
  editHyperlink: (url: string, text: string) => void;
  deleteHyperlink: () => void;

  hyperlinkBoundingBox: DOMRect;
  editorElement: Element;
};

export type HyperlinkHoverMenu = Menu<HyperlinkHoverMenuParams>;
export type HyperlinkHoverMenuFactory = MenuFactory<HyperlinkHoverMenuParams>;
