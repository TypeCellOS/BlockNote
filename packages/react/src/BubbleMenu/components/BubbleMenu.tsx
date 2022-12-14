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
import { useState } from "react";
import { formatKeyboardShortcut } from "../../utils";
import LinkToolbarButton from "./LinkToolbarButton";
import { BubbleMenuFactoryFunctions } from "../../../../core/src/menu-tools/BubbleMenu/types";

// TODO: add list options, indentation
export const BubbleMenu = (props: {
  bubbleMenuFunctions: BubbleMenuFactoryFunctions;
}) => {
  const getActiveMarks = () => {
    const activeMarks = new Set<string>();

    props.bubbleMenuFunctions.marks.bold.isActive() && activeMarks.add("bold");
    props.bubbleMenuFunctions.marks.italic.isActive() &&
      activeMarks.add("italic");
    props.bubbleMenuFunctions.marks.underline.isActive() &&
      activeMarks.add("underline");
    props.bubbleMenuFunctions.marks.strike.isActive() &&
      activeMarks.add("strike");
    props.bubbleMenuFunctions.marks.hyperlink.isActive() &&
      activeMarks.add("link");

    return activeMarks;
  };

  const getActiveBlock = () => {
    if (props.bubbleMenuFunctions.blocks.paragraph.isActive()) {
      return {
        text: "Text",
        icon: RiText,
      };
    }

    if (props.bubbleMenuFunctions.blocks.heading.isActive()) {
      if (props.bubbleMenuFunctions.blocks.heading.getLevel() === "1") {
        return {
          text: "Heading 1",
          icon: RiH1,
        };
      }

      if (props.bubbleMenuFunctions.blocks.heading.getLevel() === "2") {
        return {
          text: "Heading 2",
          icon: RiH2,
        };
      }

      if (props.bubbleMenuFunctions.blocks.heading.getLevel() === "3") {
        return {
          text: "Heading 3",
          icon: RiH3,
        };
      }
    }

    if (props.bubbleMenuFunctions.blocks.listItem.isActive()) {
      if (props.bubbleMenuFunctions.blocks.listItem.getType() === "unordered") {
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

  const [activeMarks, setActiveMarks] = useState(getActiveMarks());
  const [activeBlock, setActiveBlock] = useState(getActiveBlock());

  return (
    <Toolbar>
      <ToolbarDropdown
        text={activeBlock!.text}
        icon={activeBlock!.icon}
        items={[
          {
            onClick: () => {
              // Setting editor focus using a chained command instead causes bubble menu to flicker on click.
              props.bubbleMenuFunctions.blocks.paragraph.set();
              setActiveBlock(getActiveBlock());
            },
            text: "Text",
            icon: RiText,
            isSelected: props.bubbleMenuFunctions.blocks.paragraph.isActive(),
          },
          {
            onClick: () => {
              props.bubbleMenuFunctions.blocks.heading.set("1");
              setActiveBlock(getActiveBlock());
            },
            text: "Heading 1",
            icon: RiH1,
            isSelected:
              props.bubbleMenuFunctions.blocks.heading.isActive() &&
              props.bubbleMenuFunctions.blocks.heading.getLevel() === "1",
          },
          {
            onClick: () => {
              props.bubbleMenuFunctions.blocks.heading.set("2");
              setActiveBlock(getActiveBlock());
            },
            text: "Heading 2",
            icon: RiH2,
            isSelected:
              props.bubbleMenuFunctions.blocks.heading.isActive() &&
              props.bubbleMenuFunctions.blocks.heading.getLevel() === "2",
          },
          {
            onClick: () => {
              props.bubbleMenuFunctions.blocks.heading.set("3");
              setActiveBlock(getActiveBlock());
            },
            text: "Heading 3",
            icon: RiH3,
            isSelected:
              props.bubbleMenuFunctions.blocks.heading.isActive() &&
              props.bubbleMenuFunctions.blocks.heading.getLevel() === "3",
          },
          {
            onClick: () => {
              props.bubbleMenuFunctions.blocks.listItem.set("unordered");
              setActiveBlock(getActiveBlock());
            },
            text: "Bullet List",
            icon: RiListUnordered,
            isSelected:
              props.bubbleMenuFunctions.blocks.listItem.isActive() &&
              props.bubbleMenuFunctions.blocks.listItem.getType() ===
                "unordered",
          },
          {
            onClick: () => {
              props.bubbleMenuFunctions.blocks.listItem.set("ordered");
              setActiveBlock(getActiveBlock());
            },
            text: "Numbered List",
            icon: RiListOrdered,
            isSelected:
              props.bubbleMenuFunctions.blocks.listItem.isActive() &&
              props.bubbleMenuFunctions.blocks.listItem.getType() === "ordered",
          },
        ]}
      />
      <ToolbarButton
        onClick={() => {
          props.bubbleMenuFunctions.marks.bold.toggle();
          setActiveMarks(getActiveMarks());
        }}
        isSelected={activeMarks.has("bold")}
        mainTooltip="Bold"
        secondaryTooltip={formatKeyboardShortcut("Mod+B")}
        icon={RiBold}
      />
      <ToolbarButton
        onClick={() => {
          props.bubbleMenuFunctions.marks.italic.toggle();
          setActiveMarks(getActiveMarks());
        }}
        isSelected={activeMarks.has("italic")}
        mainTooltip="Italic"
        secondaryTooltip={formatKeyboardShortcut("Mod+I")}
        icon={RiItalic}
      />
      <ToolbarButton
        onClick={() => {
          props.bubbleMenuFunctions.marks.underline.toggle();
          setActiveMarks(getActiveMarks());
        }}
        isSelected={activeMarks.has("underline")}
        mainTooltip="Underline"
        secondaryTooltip={formatKeyboardShortcut("Mod+U")}
        icon={RiUnderline}
      />
      <ToolbarButton
        onClick={() => {
          props.bubbleMenuFunctions.marks.strike.toggle();
          setActiveMarks(getActiveMarks());
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
          setActiveMarks(getActiveMarks());
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
          setActiveMarks(getActiveMarks());
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
        hyperlinkMarkFunctions={props.bubbleMenuFunctions.marks.hyperlink}
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
