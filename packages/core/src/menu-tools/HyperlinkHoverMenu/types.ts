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

export type HyperlinkHoverMenu = Menu<HyperlinkHoverMenuProps>;
export type HyperlinkHoverMenuFactory = MenuFactory<HyperlinkHoverMenuProps>;
