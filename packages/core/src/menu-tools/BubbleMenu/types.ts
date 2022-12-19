import { Menu, MenuFactory } from "../types";

export type BasicMarkProps = {
  isActive: boolean;
  toggle: () => void;
};

export type HyperlinkMarkProps = {
  isActive: boolean;
  url: string;
  text: string;
  set: (url: string, text?: string) => void;
};

export type ParagraphBlockProps = {
  isActive: boolean;
  set: () => void;
};

export type HeadingBlockProps = {
  isActive: boolean;
  level: string;
  set: (level: string) => void;
};

export type ListItemBlockProps = {
  isActive: boolean;
  type: string;
  set: (type: string) => void;
};

export type BubbleMenuProps = {
  marks: {
    bold: BasicMarkProps;
    italic: BasicMarkProps;
    underline: BasicMarkProps;
    strike: BasicMarkProps;
    hyperlink: HyperlinkMarkProps;
  };
  blocks: {
    paragraph: ParagraphBlockProps;
    heading: HeadingBlockProps;
    listItem: ListItemBlockProps;
  };
  view: {
    getSelectionBoundingBox: () => DOMRect;
    getEditorElement: () => Element;
  };
};

export type BubbleMenu = Menu<BubbleMenuProps>;
export type BubbleMenuFactory = MenuFactory<BubbleMenuProps>;
