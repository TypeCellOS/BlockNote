import { FC } from "react";
import { Block, PartialBlock } from "@blocknote/core";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import {
  ToggleBoldButton,
  ToggleItalicButton,
  ToggleStrikethroughButton,
  ToggleUnderlineButton,
} from "./DefaultButtons/FontStyleButtons";
import {
  TextAlignCenterButton,
  TextAlignLeftButton,
  TextAlignRightButton,
} from "./DefaultButtons/TextAlignButtons";
import { SetColorsButton } from "./DefaultButtons/SetColorsButton";
import { CreateHyperlinkButton } from "./DefaultButtons/CreateHyperlinkButton";
import {
  DecreaseBlockIndentButton,
  IncreaseBlockIndentButton,
} from "./DefaultButtons/BlockIndentButtons";
import { BlockTypeDropdown } from "./DefaultDropdowns/BlockTypeDropdown";

export type FormattingToolbarProps = {
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

  textColor: string;
  setTextColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  textAlignment: "left" | "center" | "right" | "justify";
  setTextAlignment: (
    textAlignment: "left" | "center" | "right" | "justify"
  ) => void;

  canIncreaseBlockIndent: boolean;
  increaseBlockIndent: () => void;
  canDecreaseBlockIndent: boolean;
  decreaseBlockIndent: () => void;

  block: Block;
  updateBlock: (updatedBlock: PartialBlock) => void;
};

// TODO: add list options, indentation
export const FormattingToolbar: FC<FormattingToolbarProps> = (
  props: FormattingToolbarProps
) => {
  return (
    <Toolbar>
      <BlockTypeDropdown {...props} />
      <ToggleBoldButton {...props} />
      <ToggleItalicButton {...props} />
      <ToggleUnderlineButton {...props} />
      <ToggleStrikethroughButton {...props} />
      <TextAlignLeftButton {...props} />
      <TextAlignCenterButton {...props} />
      <TextAlignRightButton {...props} />
      <SetColorsButton {...props} />
      <IncreaseBlockIndentButton {...props} />
      <DecreaseBlockIndentButton {...props} />
      <CreateHyperlinkButton {...props} />
    </Toolbar>
  );
};
