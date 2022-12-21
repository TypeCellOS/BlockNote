import { BubbleMenuProps } from "@blocknote/core";
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
import { Toolbar } from "../../shared/components/toolbar/Toolbar";
import { ToolbarButton } from "../../shared/components/toolbar/ToolbarButton";
import { ToolbarDropdown } from "../../shared/components/toolbar/ToolbarDropdown";
import { formatKeyboardShortcut } from "../../utils";
import LinkToolbarButton from "./LinkToolbarButton";

// TODO: add list options, indentation
export const BubbleMenu = (props: { bubbleMenuProps: BubbleMenuProps }) => {
  const getActiveMarks = () => {
    const activeMarks = new Set<string>();

    props.bubbleMenuProps.marks.bold.isActive && activeMarks.add("bold");
    props.bubbleMenuProps.marks.italic.isActive && activeMarks.add("italic");
    props.bubbleMenuProps.marks.underline.isActive &&
      activeMarks.add("underline");
    props.bubbleMenuProps.marks.strike.isActive && activeMarks.add("strike");
    props.bubbleMenuProps.marks.hyperlink.isActive && activeMarks.add("link");

    return activeMarks;
  };

  const getActiveBlock = () => {
    if (props.bubbleMenuProps.blocks.paragraph.isActive) {
      return {
        text: "Text",
        icon: RiText,
      };
    }

    if (props.bubbleMenuProps.blocks.heading.isActive) {
      if (props.bubbleMenuProps.blocks.heading.level === "1") {
        return {
          text: "Heading 1",
          icon: RiH1,
        };
      }

      if (props.bubbleMenuProps.blocks.heading.level === "2") {
        return {
          text: "Heading 2",
          icon: RiH2,
        };
      }

      if (props.bubbleMenuProps.blocks.heading.level === "3") {
        return {
          text: "Heading 3",
          icon: RiH3,
        };
      }
    }

    if (props.bubbleMenuProps.blocks.listItem.isActive) {
      if (props.bubbleMenuProps.blocks.listItem.type === "unordered") {
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

    return undefined;
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
            onClick: () => {
              // Setting editor focus using a chained command instead causes bubble menu to flicker on click.
              props.bubbleMenuProps.blocks.paragraph.set();
            },
            text: "Text",
            icon: RiText,
            isSelected: props.bubbleMenuProps.blocks.paragraph.isActive,
          },
          {
            onClick: () => {
              props.bubbleMenuProps.blocks.heading.set("1");
            },
            text: "Heading 1",
            icon: RiH1,
            isSelected:
              props.bubbleMenuProps.blocks.heading.isActive &&
              props.bubbleMenuProps.blocks.heading.level === "1",
          },
          {
            onClick: () => {
              props.bubbleMenuProps.blocks.heading.set("2");
            },
            text: "Heading 2",
            icon: RiH2,
            isSelected:
              props.bubbleMenuProps.blocks.heading.isActive &&
              props.bubbleMenuProps.blocks.heading.level === "2",
          },
          {
            onClick: () => {
              props.bubbleMenuProps.blocks.heading.set("3");
            },
            text: "Heading 3",
            icon: RiH3,
            isSelected:
              props.bubbleMenuProps.blocks.heading.isActive &&
              props.bubbleMenuProps.blocks.heading.level === "3",
          },
          {
            onClick: () => {
              props.bubbleMenuProps.blocks.listItem.set("unordered");
            },
            text: "Bullet List",
            icon: RiListUnordered,
            isSelected:
              props.bubbleMenuProps.blocks.listItem.isActive &&
              props.bubbleMenuProps.blocks.listItem.type === "unordered",
          },
          {
            onClick: () => {
              props.bubbleMenuProps.blocks.listItem.set("ordered");
            },
            text: "Numbered List",
            icon: RiListOrdered,
            isSelected:
              props.bubbleMenuProps.blocks.listItem.isActive &&
              props.bubbleMenuProps.blocks.listItem.type === "ordered",
          },
        ]}
      />
      <ToolbarButton
        onClick={() => {
          props.bubbleMenuProps.marks.bold.toggle();
        }}
        isSelected={activeMarks.has("bold")}
        mainTooltip="Bold"
        secondaryTooltip={formatKeyboardShortcut("Mod+B")}
        icon={RiBold}
      />
      <ToolbarButton
        onClick={() => {
          props.bubbleMenuProps.marks.italic.toggle();
        }}
        isSelected={activeMarks.has("italic")}
        mainTooltip="Italic"
        secondaryTooltip={formatKeyboardShortcut("Mod+I")}
        icon={RiItalic}
      />
      <ToolbarButton
        onClick={() => {
          props.bubbleMenuProps.marks.underline.toggle();
        }}
        isSelected={activeMarks.has("underline")}
        mainTooltip="Underline"
        secondaryTooltip={formatKeyboardShortcut("Mod+U")}
        icon={RiUnderline}
      />
      <ToolbarButton
        onClick={() => {
          props.bubbleMenuProps.marks.strike.toggle();
        }}
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
        hyperlinkMarkProps={props.bubbleMenuProps.marks.hyperlink}
        isSelected={activeMarks.has("link")}
        mainTooltip="Link"
        secondaryTooltip={formatKeyboardShortcut("Mod+K")}
        icon={RiLink}
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
