import { EditorElement, ElementFactory } from "../../shared/EditorElement";
import { BlockContentType } from "../Blocks/nodes/Block";

export type FormattingToolbarStaticParams = {
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleStrike: () => void;
  setHyperlink: (url: string, text?: string) => void;

  setBlockType: (type: BlockContentType) => void;
};

export type FormattingToolbarDynamicParams = {
  boldIsActive: boolean;
  italicIsActive: boolean;
  underlineIsActive: boolean;
  strikeIsActive: boolean;
  hyperlinkIsActive: boolean;
  activeHyperlinkUrl: string;
  activeHyperlinkText: string;

  // BlockContentType is mostly used to set a block's type, so the attr field is optional as block content types have
  // default values for attributes. However, it means that a block type's attributes field will never be undefined due to
  // these default values, which the Required type enforces.
  activeBlockType: Required<BlockContentType>;

  selectionBoundingBox: DOMRect;
};

export type FormattingToolbar = EditorElement<FormattingToolbarDynamicParams>;
export type FormattingToolbarFactory = ElementFactory<
  FormattingToolbarStaticParams,
  FormattingToolbarDynamicParams
>;
