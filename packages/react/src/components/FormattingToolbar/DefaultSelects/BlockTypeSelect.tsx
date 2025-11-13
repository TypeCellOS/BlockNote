import {
  BlockNoteEditor,
  BlockSchema,
  Dictionary,
  editorHasBlockType,
  editorHasBlockTypeAndPropsAreValid,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useMemo } from "react";
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
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";

export type BlockTypeSelectItem = {
  name: string;
  type: string;
  props?: Record<string, boolean | number | string | undefined>;
  icon: IconType;
};

export const blockTypeSelectItems = (
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
  dict: Dictionary,
): BlockTypeSelectItem[] => {
  const items: BlockTypeSelectItem[] = [];
  items.push({
    name: dict.slash_menu.paragraph.title,
    type: "paragraph",
    icon: RiText,
  });

  const icons = [RiH1, RiH2, RiH3, RiH4, RiH5, RiH6];
  // regular headings
  if (
    editorHasBlockTypeAndPropsAreValid(editor, "heading", {
      level: 1,
      isToggleable: false,
    })
  ) {
    // if toggleable headings are allowed, explicitly set isToggleable to false for all levels
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      items.push({
        name: dict.slash_menu[`heading_${level}`].title,
        type: "heading",
        props: { level, isToggleable: false },
        icon: icons[level - 1],
      });
    }
  } else {
    // if toggleable headings are allowed, don't  set isToggleable
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      items.push({
        name: dict.slash_menu[`heading_${level}`].title,
        type: "heading",
        props: { level },
        icon: icons[level - 1],
      });
    }
  }

  // toggle headings
  for (const level of [1, 2, 3] as const) {
    items.push({
      name: dict.slash_menu[`toggle_heading_${level}`].title,
      type: "heading",
      props: { level, isToggleable: true },
      icon: icons[level - 1],
    });
  }

  items.push(
    {
      name: dict.slash_menu.quote.title,
      type: "quote",
      icon: RiQuoteText,
    },
    {
      name: dict.slash_menu.toggle_list.title,
      type: "toggleListItem",
      icon: RiPlayList2Fill,
    },
    {
      name: dict.slash_menu.bullet_list.title,
      type: "bulletListItem",
      icon: RiListUnordered,
    },
    {
      name: dict.slash_menu.numbered_list.title,
      type: "numberedListItem",
      icon: RiListOrdered,
    },
    {
      name: dict.slash_menu.check_list.title,
      type: "checkListItem",
      icon: RiListCheck3,
    },
  );
  return items;
};

export const BlockTypeSelect = (props: { items?: BlockTypeSelectItem[] }) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const selectedBlocks = useSelectedBlocks(editor);
  const firstSelectedBlock = selectedBlocks[0];

  // Filters out all items in which the block type and props don't conform to
  // the schema.
  const filteredItems = useMemo(
    () =>
      (props.items || blockTypeSelectItems(editor, editor.dictionary)).filter(
        (item) =>
          item.props
            ? editorHasBlockTypeAndPropsAreValid(editor, item.type, item.props)
            : editorHasBlockType(editor, item.type),
      ),
    [editor, props.items],
  );

  // Processes `filteredItems` to an array that can be passed to
  // `Components.FormattingToolbar.Select`.
  const selectItems: ComponentProps["FormattingToolbar"]["Select"]["items"] =
    useMemo(() => {
      return filteredItems.map((item) => {
        const Icon = item.icon;

        const typesMatch = item.type === firstSelectedBlock.type;
        const propsMatch =
          Object.entries(item.props || {}).filter(
            ([propName, propValue]) =>
              propValue !== firstSelectedBlock.props[propName],
          ).length === 0;

        return {
          text: item.name,
          icon: <Icon size={16} />,
          onClick: () => {
            editor.focus();
            editor.transact(() => {
              for (const block of selectedBlocks) {
                editor.updateBlock(block, {
                  type: item.type as any,
                  props: item.props as any,
                });
              }
            });
          },
          isSelected: typesMatch && propsMatch,
        };
      });
    }, [
      editor,
      filteredItems,
      firstSelectedBlock.props,
      firstSelectedBlock.type,
      selectedBlocks,
    ]);

  const shouldShow: boolean = useMemo(
    () => selectItems.find((item) => item.isSelected) !== undefined,
    [selectItems],
  );

  if (!shouldShow || !editor.isEditable) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Select
      className={"bn-select"}
      items={selectItems}
    />
  );
};
