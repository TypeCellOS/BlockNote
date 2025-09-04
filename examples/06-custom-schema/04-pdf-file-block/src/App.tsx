import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlock,
} from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";

import { RiFilePdfFill } from "react-icons/ri";

import { PDF } from "./PDF";

// Updated English dictionary with entries for PDF blocks.
const dictionary = en;
en.file_blocks.add_button_text["pdf"] = "Add PDF";
en.file_panel.embed.embed_button["pdf"] = "Embed PDF";
en.file_panel.upload.file_placeholder["pdf"] = "Upload PDF";

// Our schema with block specs, which contain the configs and implementations for blocks
// that we want our editor to use.
const schema = BlockNoteSchema.create({
  blockSpecs: {
    // Adds all default blocks.
    ...defaultBlockSpecs,
    // Adds the PDF block.
    pdf: PDF,
  },
});

// Slash menu item to insert a PDF block
const insertPDF = (editor: typeof schema.BlockNoteEditor) => ({
  title: "PDF",
  onItemClick: () => {
    insertOrUpdateBlock(editor, {
      type: "pdf",
    });
  },
  aliases: ["pdf", "document", "embed", "file"],
  group: "Other",
  icon: <RiFilePdfFill />,
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    dictionary,
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "pdf",
        props: {
          url: "https://pdfobject.com/pdf/sample.pdf",
        },
      },
      {
        type: "paragraph",
        content: "Press the '/' key to open the Slash Menu and add another PDF",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      {/* Replaces the default Slash Menu. */}
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) =>
          // Gets all default slash menu items and `insertPDF` item.
          filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor), insertPDF(editor)],
            query,
          )
        }
      />
    </BlockNoteView>
  );
}
