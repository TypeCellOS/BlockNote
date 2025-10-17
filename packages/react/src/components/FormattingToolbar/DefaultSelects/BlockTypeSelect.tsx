import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  editorHasBlockWithType,
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

export type BlockTypeSelectItem = {
  name: string;
  type: string;
  props?: Record<string, boolean | number | string>;
  icon: IconType;
  isSelected: (
    block: Block<BlockSchema, InlineContentSchema, StyleSchema>,
  ) => boolean;
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
      isSelected: (block) => block.type === "paragraph",
    });
  }

  if (editorHasBlockWithType(editor, "heading", { level: "number" })) {
    (
      editor.schema.blockSchema.heading.propSchema.level.values || [1, 2, 3]
    ).forEach((level) => {
      items.push({
        name: editor.dictionary.slash_menu[
          `heading${level === 1 ? "" : "_" + level}` as keyof typeof editor.dictionary.slash_menu
        ].title,
        type: "heading",
        props: { level },
        icon: headingLevelIcons[level],
        isSelected: (block) =>
          block.type === "heading" &&
          "level" in block.props &&
          block.props.level === level,
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
          isSelected: (block) =>
            block.type === "heading" &&
            "level" in block.props &&
            block.props.level === level &&
            "isToggleable" in block.props &&
            block.props.isToggleable,
        });
      });
  }

  if (editorHasBlockWithType(editor, "quote")) {
    items.push({
      name: editor.dictionary.slash_menu.quote.title,
      type: "quote",
      icon: RiQuoteText,
      isSelected: (block) => block.type === "quote",
    });
  }

  if (editorHasBlockWithType(editor, "toggleListItem")) {
    items.push({
      name: editor.dictionary.slash_menu.toggle_list.title,
      type: "toggleListItem",
      icon: RiPlayList2Fill,
      isSelected: (block) => block.type === "toggleListItem",
    });
  }
  if (editorHasBlockWithType(editor, "bulletListItem")) {
    items.push({
      name: editor.dictionary.slash_menu.bullet_list.title,
      type: "bulletListItem",
      icon: RiListUnordered,
      isSelected: (block) => block.type === "bulletListItem",
    });
  }
  if (editorHasBlockWithType(editor, "numberedListItem")) {
    items.push({
      name: editor.dictionary.slash_menu.numbered_list.title,
      type: "numberedListItem",
      icon: RiListOrdered,
      isSelected: (block) => block.type === "numberedListItem",
    });
  }
  if (editorHasBlockWithType(editor, "checkListItem")) {
    items.push({
      name: editor.dictionary.slash_menu.check_list.title,
      type: "checkListItem",
      icon: RiListCheck3,
      isSelected: (block) => block.type === "checkListItem",
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

  const [block, setBlock] = useState(editor.getTextCursorPosition().block);

  const filteredItems: BlockTypeSelectItem[] = useMemo(() => {
    return props.items || getDefaultBlockTypeSelectItems(editor);
  }, [editor, props.items]);

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
