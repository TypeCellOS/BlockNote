import { Editor } from "@tiptap/core";
import { Node } from "prosemirror-model";
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

// TODO: add list options, indentation
export const BubbleMenu = (props: { editor: Editor }) => {
  const getDropdownText = (node: Node) => {
    if (node.type.name === "textContent") {
      return "Text";
    }

    if (node.type.name === "headingContent") {
      return "Heading " + node.attrs["headingLevel"];
    }

    if (node.type.name === "listItemContent") {
      if (node.attrs["listItemType"] === "unordered") {
        return "Bullet List";
      } else {
        return "Ordered List";
      }
    }

    return undefined;
  };

  const getDropdownIcon = (node: Node) => {
    if (node.type.name === "textContent") {
      return RiText;
    }

    if (node.type.name === "headingContent") {
      if (node.attrs["headingLevel"] === "1") {
        return RiH1;
      }

      if (node.attrs["headingLevel"] === "2") {
        return RiH2;
      }

      if (node.attrs["headingLevel"] === "3") {
        return RiH3;
      }
    }

    if (node.type.name === "listItemContent") {
      if (node.attrs["listItemType"] === "unordered") {
        return RiListUnordered;
      } else {
        return RiListOrdered;
      }
    }

    return undefined;
  };

  const getActiveMarks = () => {
    const activeMarks = new Set<string>();

    props.editor.isActive("bold") && activeMarks.add("bold");
    props.editor.isActive("italic") && activeMarks.add("italic");
    props.editor.isActive("underline") && activeMarks.add("underline");
    props.editor.isActive("strike") && activeMarks.add("strike");
    props.editor.isActive("link") && activeMarks.add("link");

    return activeMarks;
  };

  const [selectedNode, setSelectedNode] = useState(
    props.editor.state.selection.$from.node()
  );
  const [selectedNodeMarks, setSelectedNodeMarks] = useState(getActiveMarks());

  return (
    <Toolbar>
      <ToolbarDropdown
        text={getDropdownText(selectedNode)}
        icon={getDropdownIcon(selectedNode)}
        items={[
          {
            onClick: () => {
              // Setting editor focus using a chained command instead causes bubble menu to flicker on click.
              props.editor.view.focus();
              props.editor.commands.BNSetContentType(
                props.editor.state.selection.from,
                "textContent"
              );
              setSelectedNode(props.editor.state.selection.$from.node());
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
              setSelectedNode(props.editor.state.selection.$from.node());
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
              setSelectedNode(props.editor.state.selection.$from.node());
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
              setSelectedNode(props.editor.state.selection.$from.node());
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
              setSelectedNode(props.editor.state.selection.$from.node());
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
              setSelectedNode(props.editor.state.selection.$from.node());
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
          setSelectedNodeMarks(getActiveMarks());
        }}
        isSelected={selectedNodeMarks.has("bold")}
        mainTooltip="Bold"
        secondaryTooltip={formatKeyboardShortcut("Mod+B")}
        icon={RiBold}
      />
      <ToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.toggleItalic();
          setSelectedNodeMarks(getActiveMarks());
        }}
        isSelected={selectedNodeMarks.has("italic")}
        mainTooltip="Italic"
        secondaryTooltip={formatKeyboardShortcut("Mod+I")}
        icon={RiItalic}
      />
      <ToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.toggleUnderline();
          setSelectedNodeMarks(getActiveMarks());
        }}
        isSelected={selectedNodeMarks.has("underline")}
        mainTooltip="Underline"
        secondaryTooltip={formatKeyboardShortcut("Mod+U")}
        icon={RiUnderline}
      />
      <ToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.toggleStrike();
          setSelectedNodeMarks(getActiveMarks());
        }}
        isSelected={selectedNodeMarks.has("strike")}
        mainTooltip="Strike-through"
        secondaryTooltip={formatKeyboardShortcut("Mod+Shift+X")}
        icon={RiStrikethrough}
      />
      <ToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.sinkListItem("block");
          setSelectedNodeMarks(getActiveMarks());
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
          setSelectedNodeMarks(getActiveMarks());
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
        editor={props.editor}
        isSelected={selectedNodeMarks.has("link")}
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
