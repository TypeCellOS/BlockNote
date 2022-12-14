import { Menu } from "../types";

export type HyperlinkHoverMenuFactoryFunctions = {
  hyperlink: {
    getUrl: () => string;
    getText: () => string;
    edit: (url: string, text: string) => void;
    delete: () => void;
  };
  view: {
    getHyperlinkBoundingBox: () => DOMRect | undefined;
  };
};

export type HyperlinkHoverMenuFactory = (
  functions: HyperlinkHoverMenuFactoryFunctions
) => Menu;
