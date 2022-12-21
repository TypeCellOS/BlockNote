import { Menu, MenuFactory } from "../types";

export type HyperlinkHoverMenuProps = {
  hyperlink: {
    url: string;
    text: string;
    edit: (url: string, text: string) => void;
    delete: () => void;
  };
  view: {
    hyperlinkBoundingBox: DOMRect;
    editorElement: Element;
  };
};

export type HyperlinkHoverMenuInitProps = {
  editHyperlink: (url: string, text: string) => void;
  deleteHyperlink: () => void;
  editorElement: Element;
};

export type HyperlinkHoverMenuUpdateProps = {
  hyperlinkUrl: string;
  hyperlinkText: string;
  hyperlinkBoundingBox: DOMRect;
};

export type HyperlinkHoverMenu = Menu<HyperlinkHoverMenuUpdateProps>;
export type HyperlinkHoverMenuFactory = MenuFactory<
  HyperlinkHoverMenuInitProps,
  HyperlinkHoverMenuUpdateProps
>;
