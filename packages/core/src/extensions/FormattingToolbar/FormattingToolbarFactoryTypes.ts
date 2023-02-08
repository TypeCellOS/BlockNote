import { EditorElement, ElementFactory } from "../../shared/EditorElement";
import { Block, BlockUpdate } from "../Blocks/apiTypes";

export type FormattingToolbarStaticParams = {
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleStrike: () => void;
  setHyperlink: (url: string, text?: string) => void;

  setTextColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setTextAlignment: (
    textAlignment: "left" | "center" | "right" | "justify"
  ) => void;

  increaseBlockIndent: () => void;
  decreaseBlockIndent: () => void;

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

  textColor: string;
  backgroundColor: string;
  textAlignment: "left" | "center" | "right" | "justify";

  canIncreaseBlockIndent: boolean;
  canDecreaseBlockIndent: boolean;

  block: Block;

  referenceRect: DOMRect;
};

export type FormattingToolbar = EditorElement<FormattingToolbarDynamicParams>;
export type FormattingToolbarFactory = ElementFactory<
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams
>;
