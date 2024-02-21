import {
  Block,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";

import { useBlockNoteEditor } from "../../../../editor/BlockNoteContext";
import { useEditorContentOrSelectionChange } from "../../../../hooks/useEditorContentOrSelectionChange";
import { useSelectedBlocks } from "../../../../hooks/useSelectedBlocks";
import { ToolbarDropdownItemProps } from "../../../../components-shared/Toolbar/ToolbarDropdownItem";
import { ToolbarDropdown } from "../../../../components-shared/Toolbar/ToolbarDropdown";

export type BlockTypeDropdownItem = {
  name: string;
  type: string;
  props?: Record<string, boolean | number | string>;
  icon: IconType;
  isSelected: (
    block: Block<BlockSchema, InlineContentSchema, StyleSchema>
  ) => boolean;
};

// TODO: Filtering from schema should be done here, not in component
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

export const BlockTypeDropdown = (props: {
  items?: BlockTypeDropdownItem[];
}) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const selectedBlocks = useSelectedBlocks(editor);

  const [block, setBlock] = useState(editor.getTextCursorPosition().block);

  const filteredItems: BlockTypeDropdownItem[] = useMemo(() => {
    return (props.items || blockTypeDropdownItems).filter((item) => {
      // Checks if block type exists in the schema
      if (!(item.type in editor.blockSchema)) {
        return false;
      }

      // Checks if props for the block type are valid
      for (const [prop, value] of Object.entries(item.props || {})) {
        const propSchema = editor.blockSchema[item.type].propSchema;

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
    () => filteredItems.find((item) => item.type === block.type) !== undefined,
    [block.type, filteredItems]
  );

  const fullItems: ToolbarDropdownItemProps[] = useMemo(() => {
    const onClick = (item: BlockTypeDropdownItem) => {
      editor.focus();

      for (const block of selectedBlocks) {
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
      isSelected: item.isSelected(block),
    }));
  }, [block, filteredItems, editor, selectedBlocks]);

  useEditorContentOrSelectionChange(() => {
    setBlock(editor.getTextCursorPosition().block);
  }, editor);

  if (!shouldShow) {
    return null;
  }

  return <ToolbarDropdown items={fullItems} />;
};
