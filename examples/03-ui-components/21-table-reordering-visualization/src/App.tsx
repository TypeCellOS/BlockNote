import { BlockNoteEditor } from "@blocknote/core";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";

import "./tableStyles.css";

// BlockNote's stock "/table" item inserts a table with no header row, so it
// never picks up the header styling until someone manually toggles it on.
// This swaps in a version that starts with `headerRows: 1` instead.
const getCustomSlashMenuItems = (
  editor: BlockNoteEditor<any, any, any>,
): DefaultReactSuggestionItem[] =>
  getDefaultReactSlashMenuItems(editor).map((item) => {
    // `key` is typed away on the React item (it's reserved for JSX), but the
    // underlying object - built from the same items core uses - still has it.
    const key = (item as unknown as { key?: string }).key;
    if (key !== "table") {
      return item;
    }
    return {
      ...item,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "table",
          content: {
            type: "tableContent",
            headerRows: 1,
            rows: [{ cells: ["", "", ""] }, { cells: ["", "", ""] }],
          } as any,
        }),
    };
  });

export default function App() {
  const editor = useCreateBlockNote({
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
    initialContent: [
      {
        type: "heading",
        props: { level: 2 },
        content: "Restyling BlockNote.js Table Reordering",
      },
      {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths: [180, 140, 140, 220],
          headerRows: 1,
          rows: [
            { cells: ["Column A", "Column B", "Column C", "Column D"] },
            { cells: ["1a", "1b", "1c", "1d"] },
            { cells: ["2a", "2b", "2c", "2d"] },
            { cells: ["3a", "3b", "3c", "3d"] },
          ],
        },
      },
    ],
  });

  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(getCustomSlashMenuItems(editor), query)
        }
      />
    </BlockNoteView>
  );
}
