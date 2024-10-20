import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlock,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import { Code } from "./Code";
import { Code as CodeIcon } from "lucide-react";

// Our schema with block specs, which contain the configs and implementations for blocks
// that we want our editor to use.
const schema = BlockNoteSchema.create({
  blockSpecs: {
    // Adds all default blocks.
    ...defaultBlockSpecs,
    // Adds the Code block.
    codeBlock: Code,
  },
});

// Slash menu item to insert an Code block
const insertCodeBlock = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Code",
  onItemClick: () => {
    insertOrUpdateBlock(editor, {
      type: "codeBlock",
    });
  },
  aliases: ["code"],
  group: "Others",
  icon: <CodeIcon size={18} />,
  subtext: "Insert a code block.",
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "codeBlock",
        props: {
          data: `// Your JavaScript code...
console.log('Hello, world!');`,
        },
      },
      {
        type: "paragraph",
        content: "Press the '/' key to open the Slash Menu and add another",
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
          // Gets all default slash menu items and `insertCodeBlock` item.
          filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor), insertCodeBlock(editor)],
            query
          )
        }
      />
    </BlockNoteView>
  );
}
