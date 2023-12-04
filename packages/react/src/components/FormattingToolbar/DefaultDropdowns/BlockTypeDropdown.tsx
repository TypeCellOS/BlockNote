import { Block, BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { useMemo, useState } from "react";
import { IconType } from "react-icons";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";

import { useEditorChange } from "../../../hooks/useEditorChange";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { ToolbarDropdown } from "../../../components-shared/Toolbar/ToolbarDropdown";
import type { ToolbarDropdownItemProps } from "../../../components-shared/Toolbar/ToolbarDropdownItem";

export type BlockTypeDropdownItem = {
  name: string;
  type: string;
  props?: Record<string, boolean | number | string>;
  icon: IconType;
  isSelected: (block: Block<BlockSchema, any, any>) => boolean;
};

export const defaultBlockTypeDropdownItems: BlockTypeDropdownItem[] = [
  {
    name: "Paragraph",
    type: "paragraph",
    icon: RiText,
    isSelected: (block) => block.type === "paragraph",
  },
  {
    name: "Heading 1",
    type: "heading",
    props: { level: 1 },
    icon: RiH1,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 1,
  },
  {
    name: "Heading 2",
    type: "heading",
    props: { level: 2 },
    icon: RiH2,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 2,
  },
  {
    name: "Heading 3",
    type: "heading",
    props: { level: 3 },
    icon: RiH3,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 3,
  },
  {
    name: "Bullet List",
    type: "bulletListItem",
    icon: RiListUnordered,
    isSelected: (block) => block.type === "bulletListItem",
  },
  {
    name: "Numbered List",
    type: "numberedListItem",
    icon: RiListOrdered,
    isSelected: (block) => block.type === "numberedListItem",
  },
];

export const BlockTypeDropdown = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  items?: BlockTypeDropdownItem[];
}) => {
  const selectedBlocks = useSelectedBlocks(props.editor);

  const [block, setBlock] = useState(
    props.editor.getTextCursorPosition().block
  );

  const filteredItems: BlockTypeDropdownItem[] = useMemo(() => {
    return (props.items || defaultBlockTypeDropdownItems).filter((item) => {
      // Checks if block type exists in the schema
      if (!(item.type in props.editor.blockSchema)) {
        return false;
      }

      // Checks if props for the block type are valid
      for (const [prop, value] of Object.entries(item.props || {})) {
        const propSchema = props.editor.blockSchema[item.type].propSchema;

        // Checks if the prop exists for the block type
        if (!(prop in propSchema)) {
          return false;
        }

        // Checks if the prop's value is valid
        if (
          propSchema[prop].values !== undefined &&
          !propSchema[prop].values!.includes(value)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [props.editor, props.items]);

  const shouldShow: boolean = useMemo(
    () => filteredItems.find((item) => item.type === block.type) !== undefined,
    [block.type, filteredItems]
  );

  const fullItems: ToolbarDropdownItemProps[] = useMemo(() => {
    const onClick = (item: BlockTypeDropdownItem) => {
      props.editor.focus();

      for (const block of selectedBlocks) {
        props.editor.updateBlock(block, {
          type: item.type as any,
          props: item.props as any,
        });
      }
    };

    return filteredItems.map((item) => ({
      text: item.name,
      icon: item.icon,
      onClick: () => onClick(item),
      isSelected: item.isSelected(block as Block<BlockSchema, any, any>),
    }));
  }, [block, filteredItems, props.editor, selectedBlocks]);

  useEditorChange(props.editor, () => {
    setBlock(props.editor.getTextCursorPosition().block);
  });

  if (!shouldShow) {
    return null;
  }

  return <ToolbarDropdown items={fullItems} />;
};
