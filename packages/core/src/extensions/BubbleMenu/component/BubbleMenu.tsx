import DropdownMenu, { DropdownItemGroup } from "@atlaskit/dropdown-menu";
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
import { SimpleToolbarButton } from "../../../shared/components/toolbar/SimpleToolbarButton";
import { Toolbar } from "../../../shared/components/toolbar/Toolbar";
import { useEditorForceUpdate } from "../../../shared/hooks/useEditorForceUpdate";
import { findBlock } from "../../Blocks/helpers/findBlock";
import formatKeyboardShortcut from "../../helpers/formatKeyboardShortcut";
import DropdownBlockItem from "./DropdownBlockItem";
import LinkToolbarButton from "./LinkToolbarButton";

type ListType = "li" | "oli";

function getBlockName(
  currentBlockHeading: number | undefined,
  currentBlockListType: ListType | undefined
) {
  const headings = ["Heading 1", "Heading 2", "Heading 3"];
  const lists = {
    li: "Bullet List",
    oli: "Numbered List",
  };
  // A heading that's also a list, should show as Heading
  if (currentBlockHeading) {
    return headings[currentBlockHeading - 1];
  } else if (currentBlockListType) {
    return lists[currentBlockListType];
  } else {
    return "Text";
  }
}

// TODO: add list options, indentation
export const BubbleMenu = (props: { editor: Editor }) => {
  useEditorForceUpdate(props.editor);

  const currentBlock = findBlock(props.editor.state.selection);
  const currentBlockHeading: number | undefined =
    currentBlock?.node.attrs.headingType;
  const currentBlockListType: ListType | undefined =
    currentBlock?.node.attrs.listType;

  const currentBlockName = getBlockName(
    currentBlockHeading,
    currentBlockListType
  );

  return (
    <Toolbar>
      <DropdownMenu trigger={currentBlockName}>
        <DropdownItemGroup>
          <DropdownBlockItem
            title="Text"
            icon={RiText}
            isSelected={currentBlockName === "Paragraph"}
            onClick={() =>
              props.editor.chain().focus().unsetBlockHeading().unsetList().run()
            }
          />
          <DropdownBlockItem
            title="Heading 1"
            icon={RiH1}
            isSelected={currentBlockName === "Heading 1"}
            onClick={() =>
              props.editor
                .chain()
                .focus()
                .unsetList()
                .setBlockHeading({ level: "1" })
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
                .setBlockHeading({ level: "2" })
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
                .setBlockHeading({ level: "3" })
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
        isDisabled={props.editor.isActive("strike")}
        mainTooltip="Strike-through"
        secondaryTooltip={formatKeyboardShortcut("Mod+Shift+X")}
        icon={RiStrikethrough}
      />
      <SimpleToolbarButton
        onClick={() => props.editor.chain().focus().sinkListItem("block").run()}
        isDisabled={!props.editor.can().sinkListItem("block")}
        mainTooltip="Indent"
        secondaryTooltip={formatKeyboardShortcut("Tab")}
        icon={RiIndentIncrease}
      />

      <SimpleToolbarButton
        onClick={() => props.editor.chain().focus().liftListItem("block").run()}
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
