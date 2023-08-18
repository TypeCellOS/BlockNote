import { useMemo, useState } from "react";
import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { IconType } from "react-icons";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";

import { ToolbarDropdown } from "../../../SharedComponents/Toolbar/components/ToolbarDropdown";
import { useEditorSelectionChange } from "../../../hooks/useEditorSelectionChange";
import { useEditorContentChange } from "../../../hooks/useEditorContentChange";
import { ToolbarDropdownItemProps } from "../../../SharedComponents/Toolbar/components/ToolbarDropdownItem";

export type BlockTypeDropdownItem = {
  name: string;
  type: string;
  props?: Record<string, string>;
  icon: IconType;
};

export const defaultBlockTypeDropdownItems: BlockTypeDropdownItem[] = [
  {
    name: "Paragraph",
    type: "paragraph",
    icon: RiText,
  },
  {
    name: "Heading 1",
    type: "heading",
    props: { level: "1" },
    icon: RiH1,
  },
  {
    name: "Heading 2",
    type: "heading",
    props: { level: "2" },
    icon: RiH2,
  },
  {
    name: "Heading 3",
    type: "heading",
    props: { level: "3" },
    icon: RiH3,
  },
  {
    name: "Bullet List",
    type: "bulletListItem",
    icon: RiListUnordered,
  },
  {
    name: "Numbered List",
    type: "numberedListItem",
    icon: RiListOrdered,
  },
];

export const BlockTypeDropdown = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  items?: BlockTypeDropdownItem[];
}) => {
  const [block, setBlock] = useState(
    props.editor.getTextCursorPosition().block
  );

  const filteredItems: BlockTypeDropdownItem[] = useMemo(() => {
    return (props.items || defaultBlockTypeDropdownItems).filter((item) => {
      // Checks if block type exists in the schema
      if (!(item.type in props.editor.schema)) {
        return false;
      }

      // Checks if props for the block type are valid
      for (const [prop, value] of Object.entries(item.props || {})) {
        const propSchema = props.editor.schema[item.type].propSchema;

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

  const fullItems: ToolbarDropdownItemProps[] = useMemo(
    () =>
      filteredItems.map((item) => ({
        text: item.name,
        icon: item.icon,
        onClick: () => {
          props.editor.focus();
          props.editor.updateBlock(block, {
            type: item.type,
            props: {},
          });
        },
        isSelected: block.type === item.type,
      })),
    [block, filteredItems, props.editor]
  );

  useEditorContentChange(props.editor, () => {
    setBlock(props.editor.getTextCursorPosition().block);
  });

  useEditorSelectionChange(props.editor, () => {
    setBlock(props.editor.getTextCursorPosition().block);
  });

  if (!shouldShow) {
    return null;
  }

  return <ToolbarDropdown items={fullItems} />;
};
