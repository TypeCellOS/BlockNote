import { Block, PartialBlock } from "@blocknote/core";
import { Menu } from "@mantine/core";
import {
  RiAlignCenter,
  RiAlignLeft,
  RiAlignRight,
  RiBold,
  RiH1,
  RiH2,
  RiH3,
  RiIndentDecrease,
  RiIndentIncrease,
  RiItalic,
  RiLink,
  RiListOrdered,
  RiListUnordered,
  RiStrikethrough,
  RiText,
  RiUnderline,
} from "react-icons/ri";
import { ColorIcon } from "../../SharedComponents/ColorPicker/components/ColorIcon";
import { ColorPicker } from "../../SharedComponents/ColorPicker/components/ColorPicker";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { ToolbarButton } from "../../SharedComponents/Toolbar/components/ToolbarButton";
import { ToolbarDropdown } from "../../SharedComponents/Toolbar/components/ToolbarDropdown";
import { formatKeyboardShortcut } from "../../utils";
import LinkToolbarButton from "./LinkToolbarButton";

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
export const FormattingToolbar = (props: FormattingToolbarProps) => {
  return (
    <Toolbar>
      <ToolbarDropdown
        items={[
          {
            onClick: () =>
              props.updateBlock({
                type: "paragraph",
                props: {},
              }),
            text: "Paragraph",
            icon: RiText,
            isSelected: props.block.type === "paragraph",
          },
          {
            onClick: () =>
              props.updateBlock({
                type: "heading",
                props: { level: "1" },
              }),
            text: "Heading 1",
            icon: RiH1,
            isSelected:
              props.block.type === "heading" && props.block.props.level === "1",
          },
          {
            onClick: () =>
              props.updateBlock({
                type: "heading",
                props: { level: "2" },
              }),
            text: "Heading 2",
            icon: RiH2,
            isSelected:
              props.block.type === "heading" && props.block.props.level === "2",
          },
          {
            onClick: () =>
              props.updateBlock({
                type: "heading",
                props: { level: "3" },
              }),
            text: "Heading 3",
            icon: RiH3,
            isSelected:
              props.block.type === "heading" && props.block.props.level === "3",
          },
          {
            onClick: () =>
              props.updateBlock({
                type: "bulletListItem",
                props: {},
              }),
            text: "Bullet List",
            icon: RiListUnordered,
            isSelected: props.block.type === "bulletListItem",
          },
          {
            onClick: () =>
              props.updateBlock({
                type: "numberedListItem",
                props: {},
              }),
            text: "Numbered List",
            icon: RiListOrdered,
            isSelected: props.block.type === "numberedListItem",
          },
        ]}
      />
      <ToolbarButton
        onClick={props.toggleBold}
        isSelected={props.boldIsActive}
        mainTooltip="Bold"
        secondaryTooltip={formatKeyboardShortcut("Mod+B")}
        icon={RiBold}
      />
      <ToolbarButton
        onClick={props.toggleItalic}
        isSelected={props.italicIsActive}
        mainTooltip="Italic"
        secondaryTooltip={formatKeyboardShortcut("Mod+I")}
        icon={RiItalic}
      />
      <ToolbarButton
        onClick={props.toggleUnderline}
        isSelected={props.underlineIsActive}
        mainTooltip="Underline"
        secondaryTooltip={formatKeyboardShortcut("Mod+U")}
        icon={RiUnderline}
      />
      <ToolbarButton
        onClick={props.toggleStrike}
        isSelected={props.strikeIsActive}
        mainTooltip="Strikethrough"
        secondaryTooltip={formatKeyboardShortcut("Mod+Shift+X")}
        icon={RiStrikethrough}
      />

      <ToolbarButton
        onClick={() => props.setTextAlignment("left")}
        isSelected={props.textAlignment === "left"}
        mainTooltip={"Align Text Left"}
        icon={RiAlignLeft}
      />

      <ToolbarButton
        onClick={() => props.setTextAlignment("center")}
        isSelected={props.textAlignment === "center"}
        mainTooltip={"Align Text Center"}
        icon={RiAlignCenter}
      />

      <ToolbarButton
        onClick={() => props.setTextAlignment("right")}
        isSelected={props.textAlignment === "right"}
        mainTooltip={"Align Text Right"}
        icon={RiAlignRight}
      />

      <Menu>
        <Menu.Target>
          <ToolbarButton
            mainTooltip={"Colors"}
            icon={() => (
              <ColorIcon
                textColor={props.textColor}
                backgroundColor={props.backgroundColor}
                size={20}
              />
            )}
          />
        </Menu.Target>
        <Menu.Dropdown>
          <ColorPicker
            textColor={props.textColor}
            setTextColor={props.setTextColor}
            backgroundColor={props.backgroundColor}
            setBackgroundColor={props.setBackgroundColor}
          />
        </Menu.Dropdown>
      </Menu>

      <ToolbarButton
        onClick={props.increaseBlockIndent}
        isDisabled={!props.canIncreaseBlockIndent}
        mainTooltip="Indent"
        secondaryTooltip={formatKeyboardShortcut("Tab")}
        icon={RiIndentIncrease}
      />

      <ToolbarButton
        onClick={props.decreaseBlockIndent}
        isDisabled={!props.canDecreaseBlockIndent}
        mainTooltip="Decrease Indent"
        secondaryTooltip={formatKeyboardShortcut("Shift+Tab")}
        icon={RiIndentDecrease}
      />

      <LinkToolbarButton
        isSelected={props.hyperlinkIsActive}
        mainTooltip="Link"
        secondaryTooltip={formatKeyboardShortcut("Mod+K")}
        icon={RiLink}
        hyperlinkIsActive={props.hyperlinkIsActive}
        activeHyperlinkUrl={props.activeHyperlinkUrl}
        activeHyperlinkText={props.activeHyperlinkText}
        setHyperlink={props.setHyperlink}
      />
    </Toolbar>
  );
};
