import {
  Block,
  BlockSchema,
  Dictionary,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  RiH1,
  RiH2,
  RiH3,
  RiH4,
  RiH5,
  RiH6,
  RiListCheck3,
  RiListOrdered,
  RiListUnordered,
  RiPlayList2Fill,
  RiQuoteText,
  RiText,
} from "react-icons/ri";

import {
  ComponentProps,
  useComponentsContext,
} from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorContentOrSelectionChange } from "../../../hooks/useEditorContentOrSelectionChange.js";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export type BlockTypeSelectItem = {
  name: string;
  type: string;
  props?: Record<string, boolean | number | string>;
  icon: IconType;
  isSelected: (
    block: Block<BlockSchema, InlineContentSchema, StyleSchema>,
  ) => boolean;
};

export const blockTypeSelectItems = (
  dict: Dictionary,
): BlockTypeSelectItem[] => [
  {
    name: dict.slash_menu.paragraph.title,
    type: "paragraph",
    icon: RiText,
    isSelected: (block) => block.type === "paragraph",
  },
  {
    name: dict.slash_menu.heading.title,
    type: "heading",
    props: { level: 1 },
    icon: RiH1,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 1,
  },
  {
    name: dict.slash_menu.heading_2.title,
    type: "heading",
    props: { level: 2 },
    icon: RiH2,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 2,
  },
  {
    name: dict.slash_menu.heading_3.title,
    type: "heading",
    props: { level: 3 },
    icon: RiH3,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 3,
  },
  {
    name: dict.slash_menu.heading_4.title,
    type: "heading",
    props: { level: 4 },
    icon: RiH4,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 4,
  },
  {
    name: dict.slash_menu.heading_5.title,
    type: "heading",
    props: { level: 5 },
    icon: RiH5,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 5,
  },
  {
    name: dict.slash_menu.heading_6.title,
    type: "heading",
    props: { level: 6 },
    icon: RiH6,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 6,
  },
  {
    name: dict.slash_menu.toggle_heading.title,
    type: "heading",
    props: { level: 1, isToggleable: true },
    icon: RiH1,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 1 &&
      "isToggleable" in block.props &&
      block.props.isToggleable,
  },
  {
    name: dict.slash_menu.toggle_heading_2.title,
    type: "heading",
    props: { level: 2, isToggleable: true },
    icon: RiH2,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 2 &&
      "isToggleable" in block.props &&
      block.props.isToggleable,
  },
  {
    name: dict.slash_menu.toggle_heading_3.title,
    type: "heading",
    props: { level: 3, isToggleable: true },
    icon: RiH3,
    isSelected: (block) =>
      block.type === "heading" &&
      "level" in block.props &&
      block.props.level === 3 &&
      "isToggleable" in block.props &&
      block.props.isToggleable,
  },
  {
    name: dict.slash_menu.quote.title,
    type: "quote",
    icon: RiQuoteText,
    isSelected: (block) => block.type === "quote",
  },
  {
    name: dict.slash_menu.toggle_list.title,
    type: "toggleListItem",
    icon: RiPlayList2Fill,
    isSelected: (block) => block.type === "toggleListItem",
  },
  {
    name: dict.slash_menu.bullet_list.title,
    type: "bulletListItem",
    icon: RiListUnordered,
    isSelected: (block) => block.type === "bulletListItem",
  },
  {
    name: dict.slash_menu.numbered_list.title,
    type: "numberedListItem",
    icon: RiListOrdered,
    isSelected: (block) => block.type === "numberedListItem",
  },
  {
    name: dict.slash_menu.check_list.title,
    type: "checkListItem",
    icon: RiListCheck3,
    isSelected: (block) => block.type === "checkListItem",
  },
];

export const BlockTypeSelect = (props: { items?: BlockTypeSelectItem[] }) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const selectedBlocks = useSelectedBlocks(editor);

  const [block, setBlock] = useState(editor.getTextCursorPosition().block);

  const filteredItems: BlockTypeSelectItem[] = useMemo(() => {
    return (props.items || blockTypeSelectItems(dict)).filter(
      (item) => item.type in editor.schema.blockSchema,
    );
  }, [editor, dict, props.items]);

  const shouldShow: boolean = useMemo(
    () => filteredItems.find((item) => item.type === block.type) !== undefined,
    [block.type, filteredItems],
  );

  const fullItems: ComponentProps["FormattingToolbar"]["Select"]["items"] =
    useMemo(() => {
      const onClick = (item: BlockTypeSelectItem) => {
        editor.focus();

        editor.transact(() => {
          for (const block of selectedBlocks) {
            editor.updateBlock(block, {
              type: item.type as any,
              props: item.props as any,
            });
          }
        });
      };

      return filteredItems.map((item) => {
        const Icon = item.icon;

        return {
          text: item.name,
          icon: <Icon size={16} />,
          onClick: () => onClick(item),
          isSelected: item.isSelected(block),
        };
      });
    }, [block, filteredItems, editor, selectedBlocks]);

  useEditorContentOrSelectionChange(() => {
    setBlock(editor.getTextCursorPosition().block);
  }, editor);

  if (!shouldShow || !editor.isEditable) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Select
      className={"bn-select"}
      items={fullItems}
    />
  );
};
