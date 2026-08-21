import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { useEffect, useState } from "react";
import { TbTable } from "react-icons/tb";

import {
  createTable,
  createTableCell,
  createTableHeader,
  createTableRow,
} from "./Table";
import "./styles.css";

// Drop the built-in table (the one with the special `"table"` content type)
// and replace it with our container-based implementation under the same
// `table` type name. The specs are passed to `create` rather than `extend`,
// as `extend` can only add new block types, not replace existing ones.
const { table: _defaultTable, ...remainingBlockSpecs } = defaultBlockSpecs;

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...remainingBlockSpecs,
    table: createTable(),
    tableRow: createTableRow(),
    tableCell: createTableCell(),
    tableHeader: createTableHeader(),
  },
});

// Inserting a table with no explicit children seeds it from the block's
// configured `children.default`: a 3-column table with a header row.
const insertTable = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Table",
  subtext: "Table built from container blocks",
  onItemClick: () =>
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "table",
    }),
  aliases: ["table", "grid", "cells"],
  group: "Basic blocks",
  icon: <TbTable />,
});

type AppBlock = (typeof schema.BlockNoteEditor)["document"][number];

export default function App() {
  const [blocks, setBlocks] = useState<AppBlock[]>([]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content:
          "This table is built entirely from container blocks, with no special table content type.",
      },
      {
        type: "table",
        children: [
          {
            type: "tableRow",
            children: [
              {
                type: "tableHeader",
                children: [{ type: "paragraph", content: "Name" }],
              },
              {
                type: "tableHeader",
                children: [{ type: "paragraph", content: "Notes" }],
              },
            ],
          },
          {
            type: "tableRow",
            children: [
              {
                type: "tableCell",
                children: [{ type: "paragraph", content: "Alice" }],
              },
              {
                type: "tableCell",
                children: [
                  {
                    type: "paragraph",
                    content: "Cells hold any blocks:",
                  },
                  {
                    type: "bulletListItem",
                    content: "lists,",
                  },
                  {
                    type: "bulletListItem",
                    content: "headings, images…",
                  },
                ],
              },
            ],
          },
          {
            type: "tableRow",
            children: [
              {
                type: "tableCell",
                children: [{ type: "paragraph", content: "Bob" }],
              },
              {
                type: "tableCell",
                children: [
                  {
                    type: "paragraph",
                    content: "Tab / Shift-Tab move between cells.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        content:
          "Tab in the last cell adds a row. Press '/' to insert a new table.",
      },
      {
        type: "paragraph",
      },
    ],
  });

  useEffect(() => setBlocks(editor.document), [editor]);

  return (
    <div className={"wrapper"}>
      <div>BlockNote Editor:</div>
      <div className={"item"}>
        <BlockNoteView
          editor={editor}
          slashMenu={false}
          onChange={() => {
            setBlocks(editor.document);
          }}
        >
          <SuggestionMenuController
            triggerCharacter={"/"}
            getItems={async (query) => {
              // Swap the built-in Table item (which inserts the old
              // `tableContent` shape) for one that inserts our container
              // table.
              const defaultItems = getDefaultReactSlashMenuItems(editor).filter(
                (item) => item.title !== "Table",
              );
              const lastBasicBlockIndex = defaultItems.findLastIndex(
                (item) => item.group === "Basic blocks",
              );
              defaultItems.splice(
                lastBasicBlockIndex + 1,
                0,
                insertTable(editor),
              );
              return filterSuggestionItems(defaultItems, query);
            }}
          />
        </BlockNoteView>
      </div>
      <div>Document JSON:</div>
      <div className={"item bordered"}>
        <pre>
          <code>{JSON.stringify(blocks, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}
