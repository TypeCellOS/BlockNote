import { EditorElement, ElementFactory } from "../../shared/EditorElement";

export type FormattingToolbarParams = {
  boldIsActive: boolean;
  toggleBold: () => void;
  italicIsActive: boolean;
  toggleItalic: () => void;
  underlineIsActive: boolean;
  toggleUnderline: () => void;
  strikeIsActive: boolean;
  toggleStrike: () => void;
  hyperlinkIsActive: boolean;
  activeHyperlinkUrl: string;
  activeHyperlinkText: string;
  setHyperlink: (url: string, text?: string) => void;

  paragraphIsActive: boolean;
  setParagraph: () => void;
  headingIsActive: boolean;
  activeHeadingLevel: string;
  setHeading: (level: string) => void;
  setListItem: (type: string) => void;
  listItemIsActive: boolean;
  activeListItemType: string;

  selectionBoundingBox: DOMRect;
  editorElement: Element;
};

export type FormattingToolbar = EditorElement<FormattingToolbarParams>;
export type FormattingToolbarFactory = ElementFactory<FormattingToolbarParams>;
