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
import { ToolbarButton } from "../../shared/components/toolbar/ToolbarButton";
import { ToolbarDropdown } from "../../shared/components/toolbar/ToolbarDropdown";
import { Toolbar } from "../../shared/components/toolbar/Toolbar";
import { formatKeyboardShortcut } from "../../utils";
import LinkToolbarButton from "./LinkToolbarButton";

export type BubbleMenuProps = {
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
export const BubbleMenu = (props: { bubbleMenuProps: BubbleMenuProps }) => {
  const getActiveMarks = () => {
    const activeMarks = new Set<string>();

    props.bubbleMenuProps.boldIsActive && activeMarks.add("bold");
    props.bubbleMenuProps.italicIsActive && activeMarks.add("italic");
    props.bubbleMenuProps.underlineIsActive && activeMarks.add("underline");
    props.bubbleMenuProps.strikeIsActive && activeMarks.add("strike");
    props.bubbleMenuProps.hyperlinkIsActive && activeMarks.add("link");

    return activeMarks;
  };

  const getActiveBlock = () => {
    if (props.bubbleMenuProps.headingIsActive) {
      if (props.bubbleMenuProps.activeHeadingLevel === "1") {
        return {
          text: "Heading 1",
          icon: RiH1,
        };
      }

      if (props.bubbleMenuProps.activeHeadingLevel === "2") {
        return {
          text: "Heading 2",
          icon: RiH2,
        };
      }

      if (props.bubbleMenuProps.activeHeadingLevel === "3") {
        return {
          text: "Heading 3",
          icon: RiH3,
        };
      }
    }

    if (props.bubbleMenuProps.listItemIsActive) {
      if (props.bubbleMenuProps.activeListItemType === "unordered") {
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
            onClick: () => props.bubbleMenuProps.setParagraph(),
            text: "Text",
            icon: RiText,
            isSelected: props.bubbleMenuProps.paragraphIsActive,
          },
          {
            onClick: () => props.bubbleMenuProps.setHeading("1"),
            text: "Heading 1",
            icon: RiH1,
            isSelected:
              props.bubbleMenuProps.headingIsActive &&
              props.bubbleMenuProps.activeHeadingLevel === "1",
          },
          {
            onClick: () => props.bubbleMenuProps.setHeading("2"),
            text: "Heading 2",
            icon: RiH2,
            isSelected:
              props.bubbleMenuProps.headingIsActive &&
              props.bubbleMenuProps.activeHeadingLevel === "2",
          },
          {
            onClick: () => props.bubbleMenuProps.setHeading("3"),
            text: "Heading 3",
            icon: RiH3,
            isSelected:
              props.bubbleMenuProps.headingIsActive &&
              props.bubbleMenuProps.activeHeadingLevel === "3",
          },
          {
            onClick: () => props.bubbleMenuProps.setListItem("unordered"),
            text: "Bullet List",
            icon: RiListUnordered,
            isSelected:
              props.bubbleMenuProps.listItemIsActive &&
              props.bubbleMenuProps.activeListItemType === "unordered",
          },
          {
            onClick: () => props.bubbleMenuProps.setListItem("ordered"),
            text: "Numbered List",
            icon: RiListOrdered,
            isSelected:
              props.bubbleMenuProps.listItemIsActive &&
              props.bubbleMenuProps.activeListItemType === "ordered",
          },
        ]}
      />
      <ToolbarButton
        onClick={props.bubbleMenuProps.toggleBold}
        isSelected={activeMarks.has("bold")}
        mainTooltip="Bold"
        secondaryTooltip={formatKeyboardShortcut("Mod+B")}
        icon={RiBold}
      />
      <ToolbarButton
        onClick={props.bubbleMenuProps.toggleItalic}
        isSelected={activeMarks.has("italic")}
        mainTooltip="Italic"
        secondaryTooltip={formatKeyboardShortcut("Mod+I")}
        icon={RiItalic}
      />
      <ToolbarButton
        onClick={props.bubbleMenuProps.toggleUnderline}
        isSelected={activeMarks.has("underline")}
        mainTooltip="Underline"
        secondaryTooltip={formatKeyboardShortcut("Mod+U")}
        icon={RiUnderline}
      />
      <ToolbarButton
        onClick={props.bubbleMenuProps.toggleStrike}
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
        hyperlinkIsActive={props.bubbleMenuProps.hyperlinkIsActive}
        activeHyperlinkUrl={props.bubbleMenuProps.activeHyperlinkUrl}
        activeHyperlinkText={props.bubbleMenuProps.activeHyperlinkText}
        setHyperlink={props.bubbleMenuProps.setHyperlink}
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
