import {
  BlockNoteEditor,
  BlockSchema,
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
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";

export type BlockTypeSelectItem = {
  name: string;
  type: string;
  props?: Record<string, boolean | number | string>;
  icon: IconType;
};

const headingLevelIcons: Record<any, IconType> = {
  1: RiH1,
  2: RiH2,
  3: RiH3,
  4: RiH4,
  5: RiH5,
  6: RiH6,
};

export function getDefaultBlockTypeSelectItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>) {
  const items: BlockTypeSelectItem[] = [];

  if (editorHasBlockWithType(editor, "paragraph")) {
    items.push({
      name: editor.dictionary.slash_menu.paragraph.title,
      type: "paragraph",
      icon: RiText,
    });
  }

  if (editorHasBlockWithType(editor, "heading", { level: "number" })) {
    (
      editor.schema.blockSchema.heading.propSchema.level.values || [1, 2, 3]
    ).forEach((level) => {
      items.push({
        name: editor.dictionary.slash_menu[
          // TODO: This should be cleaned up, heading level 1 has no "_1"
          // suffix which makes this more complicated than necessary.
          `heading${level === 1 ? "" : "_" + level}` as keyof typeof editor.dictionary.slash_menu
        ].title,
        type: "heading",
        props: { level, isToggleable: false },
        icon: headingLevelIcons[level],
      });
    });
  }

  if (
    editorHasBlockWithType(editor, "heading", {
      level: "number",
      isToggleable: "boolean",
    })
  ) {
    (editor.schema.blockSchema.heading.propSchema.level.values || [1, 2, 3])
      .filter((level) => level <= 3)
      .forEach((level) => {
        items.push({
          name: editor.dictionary.slash_menu[
            `toggle_heading${level === 1 ? "" : "_" + level}` as keyof typeof editor.dictionary.slash_menu
          ].title,
          type: "heading",
          props: { level, isToggleable: true },
          icon: headingLevelIcons[level],
        });
      });
  }

  if (editorHasBlockWithType(editor, "quote")) {
    items.push({
      name: editor.dictionary.slash_menu.quote.title,
      type: "quote",
      icon: RiQuoteText,
    });
  }

  if (editorHasBlockWithType(editor, "toggleListItem")) {
    items.push({
      name: editor.dictionary.slash_menu.toggle_list.title,
      type: "toggleListItem",
      icon: RiPlayList2Fill,
    });
  }
  if (editorHasBlockWithType(editor, "bulletListItem")) {
    items.push({
      name: editor.dictionary.slash_menu.bullet_list.title,
      type: "bulletListItem",
      icon: RiListUnordered,
    });
  }
  if (editorHasBlockWithType(editor, "numberedListItem")) {
    items.push({
      name: editor.dictionary.slash_menu.numbered_list.title,
      type: "numberedListItem",
      icon: RiListOrdered,
    });
  }
  if (editorHasBlockWithType(editor, "checkListItem")) {
    items.push({
      name: editor.dictionary.slash_menu.check_list.title,
      type: "checkListItem",
      icon: RiListCheck3,
    });
  }

  return items;
}

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
      (props.items || getDefaultBlockTypeSelectItems(editor)).filter((item) =>
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
