import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "@blocknote/core";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import { TbColumns2, TbColumns3 } from "react-icons/tb";

import { multiColumnSchema } from "../../blocks/schema.js";
import { getMultiColumnDictionary } from "../../i18n/dictionary.js";

export function checkMultiColumnBlocksInSchema<
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<any, I, S>,
): editor is BlockNoteEditor<typeof multiColumnSchema.blockSchema, I, S> {
  return (
    "column" in editor.schema.blockSchema &&
    editor.schema.blockSchema["columnList"] ===
      multiColumnSchema.blockSchema["columnList"] &&
    "column" in editor.schema.blockSchema &&
    editor.schema.blockSchema["column"] ===
      multiColumnSchema.blockSchema["column"]
  );
}

function getAncestorColumnList<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>): Block<BSchema, I, S> | undefined {
  let block: Block<BSchema, I, S> | undefined =
    editor.getTextCursorPosition().block;

  while (block) {
    const parent: Block<BSchema, I, S> | undefined =
      editor.getParentBlock(block);

    if (parent?.type === "columnList") {
      return parent;
    }

    block = parent;
  }

  return undefined;
}

function insertColumnList<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>, numColumns: number) {
  const columnList: PartialBlock<BSchema, I, S> = {
    type: "columnList" as any,
    children: Array.from({ length: numColumns }, () => ({
      type: "column" as any,
      children: [
        {
          type: "paragraph" as any,
        },
      ],
    })),
  };

  const ancestorColumnList = getAncestorColumnList(editor);

  if (ancestorColumnList) {
    const newBlock = editor.insertBlocks(
      [columnList],
      ancestorColumnList,
      "after",
    )[0];
    editor.setTextCursorPosition(newBlock, "start");
  } else {
    insertOrUpdateBlockForSlashMenu(editor, columnList);
  }
}

export function getMultiColumnSlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>) {
  const items: Omit<DefaultReactSuggestionItem, "key">[] = [];

  if (checkMultiColumnBlocksInSchema(editor)) {
    items.push(
      {
        ...getMultiColumnDictionary(editor).slash_menu.two_columns,
        icon: <TbColumns2 size={18} />,
        onItemClick: () => {
          insertColumnList(editor, 2);
        },
      },
      {
        ...getMultiColumnDictionary(editor).slash_menu.three_columns,
        icon: <TbColumns3 size={18} />,
        onItemClick: () => {
          insertColumnList(editor, 3);
        },
      },
    );
  }

  return items;
}
