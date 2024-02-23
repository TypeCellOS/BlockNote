import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlock,
} from "@blocknote/core";
import {
  BlockNoteView,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { RiAlertFill } from "react-icons/ri";
import { Alert } from "./Alert";

// Our schema with block specs, which contain the configs and implementations for blocks
// that we want our editor to use.
const schema = BlockNoteSchema.create({
  blockSpecs: {
    // Adds all default blocks.
    ...defaultBlockSpecs,
    // Adds the Alert block.
    alert: Alert,
  },
});

// Slash menu item to insert an Alert block
export const insertAlert = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Alert",
  onItemClick: () => {
    // TODO: document this function?
    insertOrUpdateBlock(editor, {
      type: "alert",
    });
  },
  aliases: [
    "alert",
    "notification",
    "emphasize",
    "warning",
    "error",
    "info",
    "success",
  ],
  group: "Other",
  icon: <RiAlertFill />,
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema,
  });

  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) =>
          // TODO: document?
          filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor), insertAlert(editor)],
            query
          )
        }
      />
    </BlockNoteView>
  );
}
