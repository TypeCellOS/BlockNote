import { EditorElement, ElementFactory } from "../../shared/EditorElement";
import { Block, BlockUpdate } from "../Blocks/apiTypes";

export type FormattingToolbarStaticParams = {
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleStrike: () => void;
  setHyperlink: (url: string, text?: string) => void;

  updateBlock: (blockUpdate: BlockUpdate) => void;
};

export type FormattingToolbarDynamicParams = {
  boldIsActive: boolean;
  italicIsActive: boolean;
  underlineIsActive: boolean;
  strikeIsActive: boolean;
  hyperlinkIsActive: boolean;
  activeHyperlinkUrl: string;
  activeHyperlinkText: string;

  block: Block;

  selectionBoundingBox: DOMRect;
};

export type FormattingToolbar = EditorElement<FormattingToolbarDynamicParams>;
export type FormattingToolbarFactory = ElementFactory<
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams
>;
