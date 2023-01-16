import { EditorElement, ElementFactory } from "../../shared/EditorElement";

export type FormattingToolbarStaticParams = {
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleStrike: () => void;
  setHyperlink: (url: string, text?: string) => void;

  setParagraph: () => void;
  setHeading: (level: string) => void;
  setListItem: (type: string) => void;
};

export type FormattingToolbarDynamicParams = {
  boldIsActive: boolean;
  italicIsActive: boolean;
  underlineIsActive: boolean;
  strikeIsActive: boolean;
  hyperlinkIsActive: boolean;
  activeHyperlinkUrl: string;
  activeHyperlinkText: string;

  paragraphIsActive: boolean;
  headingIsActive: boolean;
  activeHeadingLevel: string;
  listItemIsActive: boolean;
  activeListItemType: string;

  selectionBoundingBox: DOMRect;
};

export type FormattingToolbar = EditorElement<FormattingToolbarDynamicParams>;
export type FormattingToolbarFactory = ElementFactory<
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams
>;
