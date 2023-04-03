import { useEffect, useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";
import { ToolbarDropdown } from "../../../SharedComponents/Toolbar/components/ToolbarDropdown";

export const BlockTypeDropdown = (props: { editor: BlockNoteEditor }) => {
  const [block, setBlock] = useState(
    props.editor.getTextCursorPosition().block
  );

  useEffect(
    () => setBlock(props.editor.getTextCursorPosition().block),
    [props]
  );

  return (
    <ToolbarDropdown
      items={[
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "paragraph",
              props: {},
            });
          },
          text: "Paragraph",
          icon: RiText,
          isSelected: block.type === "paragraph",
        },
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "heading",
              props: { level: "1" },
            });
          },
          text: "Heading 1",
          icon: RiH1,
          isSelected: block.type === "heading" && block.props.level === "1",
        },
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "heading",
              props: { level: "2" },
            });
          },
          text: "Heading 2",
          icon: RiH2,
          isSelected: block.type === "heading" && block.props.level === "2",
        },
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "heading",
              props: { level: "3" },
            });
          },
          text: "Heading 3",
          icon: RiH3,
          isSelected: block.type === "heading" && block.props.level === "3",
        },
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "bulletListItem",
              props: {},
            });
          },
          text: "Bullet List",
          icon: RiListUnordered,
          isSelected: block.type === "bulletListItem",
        },
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "numberedListItem",
              props: {},
            });
          },
          text: "Numbered List",
          icon: RiListOrdered,
          isSelected: block.type === "numberedListItem",
        },
      ]}
    />
  );
};
