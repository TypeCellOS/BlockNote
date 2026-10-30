import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import "./tableStyles.css";

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

  return <BlockNoteView editor={editor} />;
}
