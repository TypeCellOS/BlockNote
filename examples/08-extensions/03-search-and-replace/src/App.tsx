import "@blocknote/core/fonts/inter.css";
import { SearchAndReplaceExtension } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import { SearchAndReplace } from "./SearchAndReplace.js";
import "./style.css";

export default function App() {
  const editor = useCreateBlockNote({
    extensions: [SearchAndReplaceExtension()],
    initialContent: [
      { type: "heading", content: "The fox field guide" },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "A curious ", styles: {} },
          { type: "text", text: "f", styles: { bold: true } },
          { type: "text", text: "ox", styles: { italic: true } },
          {
            type: "text",
            text: " crosses a formatting boundary. Find it just like any other fox.",
            styles: {},
          },
        ],
      },
      {
        type: "bulletListItem",
        content: "Fox sightings",
        children: [
          { type: "bulletListItem", content: "A red fox near the river." },
          { type: "bulletListItem", content: "An arctic FOX in the snow." },
        ],
      },
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["Animal", "Habitat"] },
            { cells: ["Fennec fox", "Desert"] },
            { cells: ["Gray fox", "Woodland"] },
          ],
        },
      },
      {
        type: "paragraph",
        content:
          "Try Match case, use Enter / Shift+Enter to navigate, or replace fox with wolf. Undo works as usual.",
      },
    ],
  });

  return (
    <SearchAndReplace editor={editor}>
      <BlockNoteView editor={editor} className="search-example-editor" />
    </SearchAndReplace>
  );
}
