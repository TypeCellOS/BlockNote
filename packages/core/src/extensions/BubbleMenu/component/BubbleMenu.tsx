import { Editor } from "@tiptap/core";
import React from "react";
import {
  RiBold,
  RiH1,
  RiH2,
  RiItalic,
  RiLink,
  RiStrikethrough,
  RiUnderline,
  RiIndentIncrease,
  RiIndentDecrease,
} from "react-icons/ri";
import browser from "../../../lib/atlaskit/browser";
import { SimpleToolbarButton } from "../../../shared/components/toolbar/SimpleToolbarButton";
import { Toolbar } from "../../../shared/components/toolbar/Toolbar";
import { useEditorForceUpdate } from "../../../shared/hooks/useEditorForceUpdate";
import { findBlock } from "../../Blocks/helpers/findBlock";
import LinkToolbarButton from "./LinkToolbarButton";

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

  return (
    <Toolbar>
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
        isDisabled={props.editor.isActive("strike")}
        mainTooltip="Strike-through"
        secondaryTooltip={formatKeyboardShortcut("Mod+Shift+X")}
        icon={RiStrikethrough}
      />
      <SimpleToolbarButton
        onClick={() =>
          props.editor.chain().focus().sinkListItem("tcblock").run()
        }
        isDisabled={
          !props.editor.can().chain().focus().sinkListItem("tcblock").run()
        }
        mainTooltip="Indent"
        secondaryTooltip={formatKeyboardShortcut("Tab")}
        icon={RiIndentIncrease}
      />

      <SimpleToolbarButton
        onClick={() =>
          props.editor.chain().focus().liftListItem("tcblock").run()
        }
        isDisabled={
          !props.editor.can().chain().focus().liftListItem("tcblock").run()
        }
        mainTooltip="UnIndent"
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
