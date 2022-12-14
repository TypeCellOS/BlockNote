import { Menu } from "../types";

export type BasicMarkFunctions = {
  isActive: () => boolean;
  toggle: () => void;
};

export type HyperlinkMarkFunctions = {
  isActive: () => boolean;
  getUrl: () => string;
  getText: () => string;
  set: (url: string, text?: string) => void;
};

export type ParagraphBlockFunctions = {
  isActive: () => boolean;
  set: () => void;
};

export type HeadingBlockFunctions = {
  isActive: () => boolean;
  getLevel: () => string;
  set: (level: string) => void;
};

export type ListItemBlockFunctions = {
  isActive: () => boolean;
  getType: () => string;
  set: (type: string) => void;
};

export type BubbleMenuFactoryFunctions = {
  marks: {
    bold: BasicMarkFunctions;
    italic: BasicMarkFunctions;
    underline: BasicMarkFunctions;
    strike: BasicMarkFunctions;
    hyperlink: HyperlinkMarkFunctions;
  };
  blocks: {
    paragraph: ParagraphBlockFunctions;
    heading: HeadingBlockFunctions;
    listItem: ListItemBlockFunctions;
  };
  view: {
    getSelectionBoundingBox: () => DOMRect;
    getEditorElement: () => Element;
  };
};

export type BubbleMenuFactory = (functions: BubbleMenuFactoryFunctions) => Menu;
