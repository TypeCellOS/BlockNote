import {
  Block,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useMemo } from "react";
import type { IconType } from "react-icons";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";

import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { ToolbarDropdown } from "../../../mantine-shared/Toolbar/ToolbarDropdown";
import { ToolbarDropdownItemProps } from "../../../mantine-shared/Toolbar/ToolbarDropdownItem";

export type BlockTypeDropdownItem = {
  name: string;
  type: string;
  props?: Record<string, boolean | number | string>;
  icon: IconType;
  isSelected: (
    block: Block<BlockSchema, InlineContentSchema, StyleSchema>
  ) => boolean;
};

// TODO: Filtering from schema should be done here, not in component?
export const blockTypeDropdownItems: BlockTypeDropdownItem[] = [
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

export const BlockTypeDropdown = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  items?: BlockTypeDropdownItem[];
  selectedBlocks: Block<BSchema, I, S>[];
}) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const filteredItems: BlockTypeDropdownItem[] = useMemo(() => {
    return (props.items || blockTypeDropdownItems).filter((item) => {
      // Checks if block type exists in the schema
      if (!(item.type in editor.schema.blockSchema)) {
        return false;
      }

      // Checks if props for the block type are valid
      for (const [prop, value] of Object.entries(item.props || {})) {
        const propSchema = editor.schema.blockSchema[item.type].propSchema;

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
  }, [editor, props.items]);

  const shouldShow: boolean = useMemo(
    () =>
      filteredItems.find(
        (item) => item.type === props.selectedBlocks[0].type
      ) !== undefined,
    [filteredItems, props.selectedBlocks]
  );

  const fullItems: ToolbarDropdownItemProps[] = useMemo(() => {
    const onClick = (item: BlockTypeDropdownItem) => {
      editor.focus();

      for (const block of props.selectedBlocks) {
        editor.updateBlock(block, {
          type: item.type as any,
          props: item.props as any,
        });
      }
    };

    return filteredItems.map((item) => ({
      text: item.name,
      icon: item.icon,
      onClick: () => onClick(item),
      isSelected: item.isSelected(
        props.selectedBlocks[0] as Block<
          BlockSchema,
          InlineContentSchema,
          StyleSchema
        >
      ),
    }));
  }, [filteredItems, editor, props.selectedBlocks]);

  if (!shouldShow) {
    return null;
  }

  return <ToolbarDropdown items={fullItems} />;
};
