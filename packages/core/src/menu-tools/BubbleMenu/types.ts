import { Menu, MenuFactory } from "../types";

// TODO: reconsider .set() function
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
    // TODO: Menu currently needs to delay getting the bounding box, as the editor, and its corresponding view, are
    //  passed in when an animation starts. This means that the DOMRect found will be incorrect, as the selection
    //  bounding box used to create it is from an editor view that is out of date due to the animation.
    getSelectionBoundingBox: () => DOMRect;
    editorElement: Element;
  };
};

export type BubbleMenu = Menu<BubbleMenuProps>;
export type BubbleMenuFactory = MenuFactory<BubbleMenuProps>;
