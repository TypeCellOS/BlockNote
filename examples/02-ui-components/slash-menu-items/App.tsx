import {
  BlockNoteEditor,
  filterSuggestionItems,
  PartialBlock,
} from "@blocknote/core";
import {
  BlockNoteView,
  getReactSlashMenuItems,
  SuggestionMenuController,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import { HiOutlineGlobeAlt } from "react-icons/hi";

// Command to insert "Hello World" in bold in a new block below.
const insertHelloWorld = (editor: BlockNoteEditor) => {
  // Block that the text cursor is currently in.
  const currentBlock = editor.getTextCursorPosition().block;

  // New block we want to insert.
  const helloWorldBlock: PartialBlock = {
    type: "paragraph",
    content: [{ type: "text", text: "Hello World", styles: { bold: true } }],
  };

  // Inserting the new block after the current one.
  editor.insertBlocks([helloWorldBlock], currentBlock, "after");
};

// Custom Slash Menu item which executes the above function.
const insertHelloWorldItem = {
  title: "Insert Hello World",
  onItemClick: insertHelloWorld,
  aliases: ["helloworld", "hw"],
  group: "Other",
  icon: <HiOutlineGlobeAlt size={18} />,
  subtext: "Used to insert a block with 'Hello World' below.",
};

// List containing all default Slash Menu Items, as well as our custom one.
export const getCustomSlashMenuItems = (editor: BlockNoteEditor) => [
  ...getReactSlashMenuItems(editor),
  insertHelloWorldItem,
];

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) =>
          filterSuggestionItems(getCustomSlashMenuItems(editor), query)
        }
      />
    </BlockNoteView>
  );
}
