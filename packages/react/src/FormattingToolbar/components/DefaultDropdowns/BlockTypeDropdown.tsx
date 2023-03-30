import { Block, PartialBlock } from "@blocknote/core";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";
import { ToolbarDropdown } from "../../../SharedComponents/Toolbar/components/ToolbarDropdown";

export type BlockTypeDropdownProps = {
  block: Block;
  updateBlock: (updatedBlock: PartialBlock) => void;
};

export const BlockTypeDropdown = (props: BlockTypeDropdownProps) => (
  <ToolbarDropdown
    items={[
      {
        onClick: () =>
          props.updateBlock({
            type: "paragraph",
            props: {},
          }),
        text: "Paragraph",
        icon: RiText,
        isSelected: props.block.type === "paragraph",
      },
      {
        onClick: () =>
          props.updateBlock({
            type: "heading",
            props: { level: "1" },
          }),
        text: "Heading 1",
        icon: RiH1,
        isSelected:
          props.block.type === "heading" && props.block.props.level === "1",
      },
      {
        onClick: () =>
          props.updateBlock({
            type: "heading",
            props: { level: "2" },
          }),
        text: "Heading 2",
        icon: RiH2,
        isSelected:
          props.block.type === "heading" && props.block.props.level === "2",
      },
      {
        onClick: () =>
          props.updateBlock({
            type: "heading",
            props: { level: "3" },
          }),
        text: "Heading 3",
        icon: RiH3,
        isSelected:
          props.block.type === "heading" && props.block.props.level === "3",
      },
      {
        onClick: () =>
          props.updateBlock({
            type: "bulletListItem",
            props: {},
          }),
        text: "Bullet List",
        icon: RiListUnordered,
        isSelected: props.block.type === "bulletListItem",
      },
      {
        onClick: () =>
          props.updateBlock({
            type: "numberedListItem",
            props: {},
          }),
        text: "Numbered List",
        icon: RiListOrdered,
        isSelected: props.block.type === "numberedListItem",
      },
    ]}
  />
);
