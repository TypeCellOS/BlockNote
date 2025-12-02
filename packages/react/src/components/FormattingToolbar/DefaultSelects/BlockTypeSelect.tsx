import {
  BlockSchema,
  Dictionary,
  editorHasBlockWithType,
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
import { useEditorState } from "../../../hooks/useEditorState.js";

export type BlockTypeSelectItem = {
  name: string;
  type: string;
  props?: Record<string, boolean | number | string>;
  icon: IconType;
};

export const blockTypeSelectItems = (
  dict: Dictionary,
): BlockTypeSelectItem[] => [
  {
    name: dict.slash_menu.paragraph.title,
    type: "paragraph",
    icon: RiText,
  },
  {
    name: dict.slash_menu.heading.title,
    type: "heading",
    props: { level: 1, isToggleable: false },
    icon: RiH1,
  },
  {
    name: dict.slash_menu.heading_2.title,
    type: "heading",
    props: { level: 2, isToggleable: false },
    icon: RiH2,
  },
  {
    name: dict.slash_menu.heading_3.title,
    type: "heading",
    props: { level: 3, isToggleable: false },
    icon: RiH3,
  },
  {
    name: dict.slash_menu.heading_4.title,
    type: "heading",
    props: { level: 4, isToggleable: false },
    icon: RiH4,
  },
  {
    name: dict.slash_menu.heading_5.title,
    type: "heading",
    props: { level: 5, isToggleable: false },
    icon: RiH5,
  },
  {
    name: dict.slash_menu.heading_6.title,
    type: "heading",
    props: { level: 6, isToggleable: false },
    icon: RiH6,
  },
  {
    name: dict.slash_menu.toggle_heading.title,
    type: "heading",
    props: { level: 1, isToggleable: true },
    icon: RiH1,
  },
  {
    name: dict.slash_menu.toggle_heading_2.title,
    type: "heading",
    props: { level: 2, isToggleable: true },
    icon: RiH2,
  },
  {
    name: dict.slash_menu.toggle_heading_3.title,
    type: "heading",
    props: { level: 3, isToggleable: true },
    icon: RiH3,
  },
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
];

export const BlockTypeSelect = (props: { items?: BlockTypeSelectItem[] }) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const selectedBlocks = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor.getSelection()?.blocks || [editor.getTextCursorPosition().block],
  });
  const firstSelectedBlock = selectedBlocks[0];

  // Filters out all items in which the block type and props don't conform to
  // the schema.
  const filteredItems = useMemo(
    () =>
      (props.items || blockTypeSelectItems(editor.dictionary)).filter((item) =>
        editorHasBlockWithType(
          editor,
          item.type,
          Object.fromEntries(
            Object.entries(item.props || {}).map(([propName, propValue]) => [
              propName,
              typeof propValue,
            ]),
          ) as Record<string, "string" | "number" | "boolean">,
        ),
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
