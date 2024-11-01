import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  insertOrUpdateBlock,
  StyleSchema,
} from "@blocknote/core";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import { TbColumns2, TbColumns3 } from "react-icons/tb";

import { multiColumnSchema } from "../../blocks/schema.js";

export function checkMultiColumnBlocksInSchema<
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<any, I, S>
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

export function getMultiColumnSlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>) {
  const items: Omit<DefaultReactSuggestionItem, "key">[] = [];

  if (checkMultiColumnBlocksInSchema(editor)) {
    items.push(
      {
        title: "Two Columns",
        subtext: "Two columns side by side",
        aliases: ["columns", "row", "split"],
        group: "Basic blocks",
        icon: <TbColumns2 size={18} />,
        onItemClick: () => {
          insertOrUpdateBlock(editor, {
            type: "columnList",
            children: [
              {
                type: "column",
                children: [
                  {
                    type: "paragraph" as any,
                  },
                ],
              },
              {
                type: "column",
                children: [
                  {
                    type: "paragraph" as any,
                  },
                ],
              },
            ],
          });
        },
      },
      {
        title: "Three Columns",
        subtext: "Three columns side by side",
        aliases: ["columns", "row", "split"],
        group: "Basic blocks",
        icon: <TbColumns3 size={18} />,
        onItemClick: () => {
          insertOrUpdateBlock(editor, {
            type: "columnList",
            children: [
              {
                type: "column",
                children: [
                  {
                    type: "paragraph" as any,
                  },
                ],
              },
              {
                type: "column",
                children: [
                  {
                    type: "paragraph" as any,
                  },
                ],
              },
              {
                type: "column",
                children: [
                  {
                    type: "paragraph" as any,
                  },
                ],
              },
            ],
          });
        },
      }
    );
  }

  return items;
}
