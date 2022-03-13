import { Editor } from "@tiptap/core";
import React from "react";
import {
  RiBold,
  RiH1,
  RiH2,
  RiH3,
  RiItalic,
  RiLink,
  RiStrikethrough,
  RiUnderline,
  RiText,
} from "react-icons/ri";
import browser from "../../../lib/atlaskit/browser";
import { SimpleToolbarButton } from "../../../shared/components/toolbar/SimpleToolbarButton";
import { Toolbar } from "../../../shared/components/toolbar/Toolbar";
import { useEditorForceUpdate } from "../../../shared/hooks/useEditorForceUpdate";
import { findBlock } from "../../Blocks/helpers/findBlock";
import LinkToolbarButton from "./LinkToolbarButton";
import DropdownMenu, { DropdownItemGroup } from "@atlaskit/dropdown-menu";
import DropdownBlockItem from "./DropdownBlockItem";

function formatKeyboardShortcut(shortcut: string) {
  if (browser.ios || browser.mac) {
    return shortcut.replace("Mod", "⌘");
  } else {
    return shortcut.replace("Mod", "Ctrl");
  }
}

// TODO: add list options, indentation
export const BubbleMenu = (props: { editor: Editor }) => {
  useEditorForceUpdate(props.editor);

  // TODO: For heading, there should be a drop down menu similar to notion
  const isHeadingActive =
    findBlock(props.editor.state.selection)?.node.attrs.headingType === 1;

  const isHeading2Active =
    findBlock(props.editor.state.selection)?.node.attrs.headingType === 2;

  const currentBlockHeading = findBlock(props.editor.state.selection)?.node
    .attrs.headingType;

  const currentBlockName = (() => {
    switch (currentBlockHeading) {
      case 1:
        return "Heading 1";
      case 2:
        return "Heading 2";
      case 3:
        return "Heading 3";
      default:
        return "Paragraph";
    }
  })();

  return (
    <Toolbar>
      <DropdownMenu trigger={currentBlockName}>
        <DropdownItemGroup>
          <DropdownBlockItem
            title="Heading 1"
            icon={RiH1}
            isSelected={currentBlockHeading === 1}
            onClick={() =>
              props.editor.chain().focus().setBlockHeading({ level: 1 }).run()
            }
          />
          <DropdownBlockItem
            title="Heading 2"
            icon={RiH2}
            isSelected={currentBlockHeading === 2}
            onClick={() =>
              props.editor.chain().focus().setBlockHeading({ level: 2 }).run()
            }
          />
          <DropdownBlockItem
            title="Heading 3"
            icon={RiH3}
            isSelected={currentBlockHeading === 3}
            onClick={() =>
              props.editor.chain().focus().setBlockHeading({ level: 3 }).run()
            }
          />
          <DropdownBlockItem
            title="Paragraph"
            icon={RiText}
            isSelected={currentBlockHeading === undefined}
            onClick={() =>
              props.editor.chain().focus().unsetBlockHeading().run()
            }
          />
        </DropdownItemGroup>
      </DropdownMenu>
      <SimpleToolbarButton
        onClick={() =>
          isHeadingActive
            ? props.editor.chain().focus().unsetBlockHeading().run()
            : props.editor.chain().focus().setBlockHeading({ level: 1 }).run()
        }
        isSelected={isHeadingActive}
        mainTooltip="Heading"
        icon={RiH1}
      />
      <SimpleToolbarButton
        onClick={() =>
          isHeading2Active
            ? props.editor.chain().focus().unsetBlockHeading().run()
            : props.editor.chain().focus().setBlockHeading({ level: 2 }).run()
        }
        isSelected={isHeading2Active}
        mainTooltip="Heading 2"
        icon={RiH2}
      />
      <SimpleToolbarButton
        onClick={() => props.editor.chain().focus().toggleBold().run()}
        isSelected={props.editor.isActive("bold")}
        mainTooltip="Bold"
        secondaryTooltip={formatKeyboardShortcut("Mod+B")}
        icon={RiBold}
      />
      <SimpleToolbarButton
        onClick={() => props.editor.chain().focus().toggleItalic().run()}
        isSelected={props.editor.isActive("italic")}
        mainTooltip="Italic"
        secondaryTooltip={formatKeyboardShortcut("Mod+I")}
        icon={RiItalic}
      />
      <SimpleToolbarButton
        onClick={() => props.editor.chain().focus().toggleUnderline().run()}
        isSelected={props.editor.isActive("underline")}
        mainTooltip="Underline"
        secondaryTooltip={formatKeyboardShortcut("Mod+U")}
        icon={RiUnderline}
      />
      <SimpleToolbarButton
        onClick={() => props.editor.chain().focus().toggleStrike().run()}
        isSelected={props.editor.isActive("strike")}
        mainTooltip="Strike-through"
        secondaryTooltip={formatKeyboardShortcut("Mod+Shift+X")}
        icon={RiStrikethrough}
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
