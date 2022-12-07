import { Editor } from "@tiptap/core";
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
import { ToolbarButton } from "../../../shared/components/toolbar/ToolbarButton";
import { ToolbarDropdown } from "../../../shared/components/toolbar/ToolbarDropdown";
import { Toolbar } from "../../../shared/components/toolbar/Toolbar";
import { useEditorForceUpdate } from "../../../shared/hooks/useEditorForceUpdate";
import { findBlock } from "../../Blocks/helpers/findBlock";
import { formatKeyboardShortcut } from "../../../utils";
import LinkToolbarButton from "./LinkToolbarButton";
import { IconType } from "react-icons";
import { Node } from "prosemirror-model";

function getBlockName(blockContentNode: Node) {
  if (blockContentNode.type.name === "textContent") {
    return "Text";
  }

  if (blockContentNode.type.name === "headingContent") {
    return "Heading " + blockContentNode.attrs["headingLevel"];
  }

  if (blockContentNode.type.name === "listItemContent") {
    return blockContentNode.attrs["listItemType"] === "unordered"
      ? "Bullet List"
      : "Numbered List";
  }

  return "";
}

// TODO: add list options, indentation
export const BubbleMenu = (props: { editor: Editor }) => {
  useEditorForceUpdate(props.editor);

  const selectedNode = props.editor.state.selection.$from.node();
  const currentBlockName = getBlockName(selectedNode);

  const blockIconMap: Record<string, IconType> = {
    Text: RiText,
    "Heading 1": RiH1,
    "Heading 2": RiH2,
    "Heading 3": RiH3,
    "Bullet List": RiListUnordered,
    "Numbered List": RiListOrdered,
  };

  return (
    <Toolbar>
      <ToolbarDropdown
        text={currentBlockName}
        icon={blockIconMap[currentBlockName]}
        items={[
          {
            onClick: () => {
              // Setting editor focus using a chained command instead causes bubble menu to flicker on click.
              props.editor.view.focus();
              props.editor.commands.BNSetContentType(
                props.editor.state.selection.from,
                "textContent"
              );
            },
            text: "Text",
            icon: RiText,
            isSelected: selectedNode.type.name === "textContent",
          },
          {
            onClick: () => {
              props.editor.view.focus();
              props.editor.commands.BNSetContentType(
                props.editor.state.selection.from,
                "headingContent",
                {
                  headingLevel: "1",
                }
              );
            },
            text: "Heading 1",
            icon: RiH1,
            isSelected:
              selectedNode.type.name === "headingContent" &&
              selectedNode.attrs["headingLevel"] === "1",
          },
          {
            onClick: () => {
              props.editor.view.focus();
              props.editor.commands.BNSetContentType(
                props.editor.state.selection.from,
                "headingContent",
                {
                  headingLevel: "2",
                }
              );
            },
            text: "Heading 2",
            icon: RiH2,
            isSelected:
              selectedNode.type.name === "headingContent" &&
              selectedNode.attrs["headingLevel"] === "2",
          },
          {
            onClick: () => {
              props.editor.view.focus();
              props.editor.commands.BNSetContentType(
                props.editor.state.selection.from,
                "headingContent",
                {
                  headingLevel: "3",
                }
              );
            },
            text: "Heading 3",
            icon: RiH3,
            isSelected:
              selectedNode.type.name === "headingContent" &&
              selectedNode.attrs["headingLevel"] === "3",
          },
          {
            onClick: () => {
              props.editor.view.focus();
              props.editor.commands.BNSetContentType(
                props.editor.state.selection.from,
                "listItemContent",
                {
                  listItemType: "unordered",
                }
              );
            },
            text: "Bullet List",
            icon: RiListUnordered,
            isSelected:
              selectedNode.type.name === "listItemContent" &&
              selectedNode.attrs["listItemType"] === "unordered",
          },
          {
            onClick: () => {
              props.editor.view.focus();
              props.editor.commands.BNSetContentType(
                props.editor.state.selection.from,
                "listItemContent",
                {
                  listItemType: "ordered",
                }
              );
            },
            text: "Numbered List",
            icon: RiListOrdered,
            isSelected:
              selectedNode.type.name === "listItemContent" &&
              selectedNode.attrs["listItemType"] === "ordered",
          },
        ]}
      />
      <ToolbarButton
        onClick={() => {
          // Setting editor focus using a chained command instead causes bubble menu to flicker on click.
          props.editor.view.focus();
          props.editor.commands.toggleBold();
        }}
        isSelected={props.editor.isActive("bold")}
        mainTooltip="Bold"
        secondaryTooltip={formatKeyboardShortcut("Mod+B")}
        icon={RiBold}
      />
      <ToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.toggleItalic();
        }}
        isSelected={props.editor.isActive("italic")}
        mainTooltip="Italic"
        secondaryTooltip={formatKeyboardShortcut("Mod+I")}
        icon={RiItalic}
      />
      <ToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.toggleUnderline();
        }}
        isSelected={props.editor.isActive("underline")}
        mainTooltip="Underline"
        secondaryTooltip={formatKeyboardShortcut("Mod+U")}
        icon={RiUnderline}
      />
      <ToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.toggleStrike();
        }}
        isSelected={props.editor.isActive("strike")}
        mainTooltip="Strike-through"
        secondaryTooltip={formatKeyboardShortcut("Mod+Shift+X")}
        icon={RiStrikethrough}
      />
      <ToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.sinkListItem("block");
        }}
        isDisabled={!props.editor.can().sinkListItem("block")}
        mainTooltip="Indent"
        secondaryTooltip={formatKeyboardShortcut("Tab")}
        icon={RiIndentIncrease}
      />

      <ToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.liftListItem("block");
        }}
        isDisabled={
          !props.editor.can().command(({ state }) => {
            const block = findBlock(state.selection);
            if (!block) {
              return false;
            }
            // If the depth is greater than 2 you can lift
            return block.depth > 2;
          })
        }
        mainTooltip="Decrease Indent"
        secondaryTooltip={formatKeyboardShortcut("Shift+Tab")}
        icon={RiIndentDecrease}
      />

      <LinkToolbarButton
        // editor={props.editor}
        isSelected={props.editor.isActive("link")}
        mainTooltip="Link"
        secondaryTooltip={formatKeyboardShortcut("Mod+K")}
        icon={RiLink}
        editor={props.editor}
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
