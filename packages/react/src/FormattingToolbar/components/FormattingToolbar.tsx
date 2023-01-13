import {
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
import { ToolbarButton } from "../../SharedComponents/Toolbar/components/ToolbarButton";
import { ToolbarDropdown } from "../../SharedComponents/Toolbar/components/ToolbarDropdown";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
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

  paragraphIsActive: boolean;
  setParagraph: () => void;
  headingIsActive: boolean;
  activeHeadingLevel: string;
  setHeading: (level: string) => void;
  listItemIsActive: boolean;
  activeListItemType: string;
  setListItem: (type: string) => void;
};

// TODO: add list options, indentation
export const FormattingToolbar = (props: {
  formattingToolbarProps: FormattingToolbarProps;
}) => {
  const getActiveMarks = () => {
    const activeMarks = new Set<string>();

    props.formattingToolbarProps.boldIsActive && activeMarks.add("bold");
    props.formattingToolbarProps.italicIsActive && activeMarks.add("italic");
    props.formattingToolbarProps.underlineIsActive &&
      activeMarks.add("underline");
    props.formattingToolbarProps.strikeIsActive && activeMarks.add("strike");
    props.formattingToolbarProps.hyperlinkIsActive && activeMarks.add("link");

    return activeMarks;
  };

  const getActiveBlock = () => {
    if (props.formattingToolbarProps.headingIsActive) {
      if (props.formattingToolbarProps.activeHeadingLevel === "1") {
        return {
          text: "Heading 1",
          icon: RiH1,
        };
      }

      if (props.formattingToolbarProps.activeHeadingLevel === "2") {
        return {
          text: "Heading 2",
          icon: RiH2,
        };
      }

      if (props.formattingToolbarProps.activeHeadingLevel === "3") {
        return {
          text: "Heading 3",
          icon: RiH3,
        };
      }
    }

    if (props.formattingToolbarProps.listItemIsActive) {
      if (props.formattingToolbarProps.activeListItemType === "unordered") {
        return {
          text: "Bullet List",
          icon: RiListUnordered,
        };
      } else {
        return {
          text: "Ordered List",
          icon: RiListOrdered,
        };
      }
    }

    return {
      text: "Text",
      icon: RiText,
    };
  };

  const activeMarks = getActiveMarks();
  const activeBlock = getActiveBlock();

  return (
    <Toolbar>
      <ToolbarDropdown
        text={activeBlock!.text}
        icon={activeBlock!.icon}
        items={[
          {
            onClick: () => props.formattingToolbarProps.setParagraph(),
            text: "Text",
            icon: RiText,
            isSelected: props.formattingToolbarProps.paragraphIsActive,
          },
          {
            onClick: () => props.formattingToolbarProps.setHeading("1"),
            text: "Heading 1",
            icon: RiH1,
            isSelected:
              props.formattingToolbarProps.headingIsActive &&
              props.formattingToolbarProps.activeHeadingLevel === "1",
          },
          {
            onClick: () => props.formattingToolbarProps.setHeading("2"),
            text: "Heading 2",
            icon: RiH2,
            isSelected:
              props.formattingToolbarProps.headingIsActive &&
              props.formattingToolbarProps.activeHeadingLevel === "2",
          },
          {
            onClick: () => props.formattingToolbarProps.setHeading("3"),
            text: "Heading 3",
            icon: RiH3,
            isSelected:
              props.formattingToolbarProps.headingIsActive &&
              props.formattingToolbarProps.activeHeadingLevel === "3",
          },
          {
            onClick: () =>
              props.formattingToolbarProps.setListItem("unordered"),
            text: "Bullet List",
            icon: RiListUnordered,
            isSelected:
              props.formattingToolbarProps.listItemIsActive &&
              props.formattingToolbarProps.activeListItemType === "unordered",
          },
          {
            onClick: () => props.formattingToolbarProps.setListItem("ordered"),
            text: "Numbered List",
            icon: RiListOrdered,
            isSelected:
              props.formattingToolbarProps.listItemIsActive &&
              props.formattingToolbarProps.activeListItemType === "ordered",
          },
        ]}
      />
      <ToolbarButton
        onClick={props.formattingToolbarProps.toggleBold}
        isSelected={activeMarks.has("bold")}
        mainTooltip="Bold"
        secondaryTooltip={formatKeyboardShortcut("Mod+B")}
        icon={RiBold}
      />
      <ToolbarButton
        onClick={props.formattingToolbarProps.toggleItalic}
        isSelected={activeMarks.has("italic")}
        mainTooltip="Italic"
        secondaryTooltip={formatKeyboardShortcut("Mod+I")}
        icon={RiItalic}
      />
      <ToolbarButton
        onClick={props.formattingToolbarProps.toggleUnderline}
        isSelected={activeMarks.has("underline")}
        mainTooltip="Underline"
        secondaryTooltip={formatKeyboardShortcut("Mod+U")}
        icon={RiUnderline}
      />
      <ToolbarButton
        onClick={props.formattingToolbarProps.toggleStrike}
        isSelected={activeMarks.has("strike")}
        mainTooltip="Strike-through"
        secondaryTooltip={formatKeyboardShortcut("Mod+Shift+X")}
        icon={RiStrikethrough}
      />
      <ToolbarButton
        onClick={() => {
          // props.editor.view.focus();
          // props.editor.commands.sinkListItem("block");
        }}
        isDisabled={
          // !props.editor.can().sinkListItem("block")
          true
        }
        mainTooltip="Indent"
        secondaryTooltip={formatKeyboardShortcut("Tab")}
        icon={RiIndentIncrease}
      />

      <ToolbarButton
        onClick={() => {
          // props.editor.view.focus();
          // props.editor.commands.liftListItem("block");
        }}
        isDisabled={
          // !props.editor.can().command(({ state }) => {
          //   const block = findBlock(state.selection);
          //   if (!block) {
          //     return false;
          //   }
          //   // If the depth is greater than 2 you can lift
          //   return block.depth > 2;
          // })
          true
        }
        mainTooltip="Decrease Indent"
        secondaryTooltip={formatKeyboardShortcut("Shift+Tab")}
        icon={RiIndentDecrease}
      />

      <LinkToolbarButton
        isSelected={activeMarks.has("link")}
        mainTooltip="Link"
        secondaryTooltip={formatKeyboardShortcut("Mod+K")}
        icon={RiLink}
        hyperlinkIsActive={props.formattingToolbarProps.hyperlinkIsActive}
        activeHyperlinkUrl={props.formattingToolbarProps.activeHyperlinkUrl}
        activeHyperlinkText={props.formattingToolbarProps.activeHyperlinkText}
        setHyperlink={props.formattingToolbarProps.setHyperlink}
      />
      {/* <SimpleBubbleMenuButton
          editor={props.editor}
          onClick={() => {
            const comment = this.props.commentStore.createComment();
            props.editor.chain().focus().setComment(comment.id).run();
          }}
          styleDetails={comment}
        /> */}
    </Toolbar>
  );
};
