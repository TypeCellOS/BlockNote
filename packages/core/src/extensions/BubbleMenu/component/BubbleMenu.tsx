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
  RiListOrdered,
  RiListUnordered,
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

  const currentBlock = findBlock(props.editor.state.selection);
  const currentBlockHeading = currentBlock?.node.attrs.headingType;
  const currentBlockListType = currentBlock?.node.attrs.listType;

  const currentBlockName = (() => {
    // A heading that's also a list, should show as Heading
    if (currentBlockHeading) {
      switch (currentBlockHeading) {
        case 1:
          return "Heading 1";
        case 2:
          return "Heading 2";
        case 3:
          return "Heading 3";
      }
    }
    switch (currentBlockListType) {
      case "li": //bullet list
        return "Bullet List";
      case "oli": //numbered list
        return "Numbered List";
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
            isSelected={currentBlockName === "Heading 1"}
            onClick={() =>
              props.editor
                .chain()
                .focus()
                .unsetList()
                .setBlockHeading({ level: 1 })
                .run()
            }
          />
          <DropdownBlockItem
            title="Heading 2"
            icon={RiH2}
            isSelected={currentBlockName === "Heading 2"}
            onClick={() =>
              props.editor
                .chain()
                .focus()
                .unsetList()
                .setBlockHeading({ level: 2 })
                .run()
            }
          />
          <DropdownBlockItem
            title="Heading 3"
            icon={RiH3}
            isSelected={currentBlockName === "Heading 3"}
            onClick={() =>
              props.editor
                .chain()
                .focus()
                .unsetList()
                .setBlockHeading({ level: 3 })
                .run()
            }
          />
          <DropdownBlockItem
            title="Bullet List"
            icon={RiListUnordered}
            isSelected={currentBlockName === "Bullet List"}
            onClick={() =>
              props.editor
                .chain()
                .focus()
                .unsetBlockHeading()
                .setBlockList("li")
                .run()
            }
          />
          <DropdownBlockItem
            title="Numbered List"
            icon={RiListOrdered}
            isSelected={currentBlockName === "Numbered List"}
            onClick={() =>
              props.editor
                .chain()
                .focus()
                .unsetBlockHeading()
                .setBlockList("oli")
                .run()
            }
          />
          <DropdownBlockItem
            title="Paragraph"
            icon={RiText}
            isSelected={currentBlockName === "Paragraph"}
            onClick={() =>
              props.editor.chain().focus().unsetBlockHeading().unsetList().run()
            }
          />
        </DropdownItemGroup>
      </DropdownMenu>
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
