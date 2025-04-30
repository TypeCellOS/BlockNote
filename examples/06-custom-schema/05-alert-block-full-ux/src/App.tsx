import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlock,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbarController,
  SuggestionMenuController,
  blockTypeSelectItems,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
  BlockTypeSelectItem,
  FormattingToolbar,
} from "@blocknote/react";

import { RiAlertFill } from "react-icons/ri";
import { Alert } from "./Alert.js";

// Our schema with block specs, which contain the configs and implementations for
// blocks that we want our editor to use.
const schema = BlockNoteSchema.create({
  blockSpecs: {
    // Adds all default blocks.
    ...defaultBlockSpecs,
    // Adds the Alert block.
    alert: Alert,
  },
});

// Slash menu item to insert an Alert block
const insertAlert = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Alert",
  subtext: "Alert for emphasizing text",
  onItemClick: () =>
    // If the block containing the text caret is empty, `insertOrUpdateBlock`
    // changes its type to the provided block. Otherwise, it inserts the new
    // block below and moves the text caret to it. We use this function with an
    // Alert block.
    insertOrUpdateBlock(editor, {
      type: "alert",
    }),
  aliases: [
    "alert",
    "notification",
    "emphasize",
    "warning",
    "error",
    "info",
    "success",
  ],
  group: "Basic blocks",
  icon: <RiAlertFill />,
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
        type: "alert",
        content: "This is an example alert",
      },
      {
        type: "paragraph",
        content: "Press the '/' key to open the Slash Menu and add another",
      },
      {
        type: "paragraph",
        content:
          "Or select some text to see the alert in the Formatting Toolbar's Block Type Select",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false} slashMenu={false}>
      {/* Replaces the default Formatting Toolbar */}
      <FormattingToolbarController
        formattingToolbar={() => (
          // Uses the default Formatting Toolbar.
          <FormattingToolbar
            // Sets the items in the Block Type Select.
            blockTypeSelectItems={[
              // Gets the default Block Type Select items.
              ...blockTypeSelectItems(editor.dictionary),
              // Adds an item for the Alert block.
              {
                name: "Alert",
                type: "alert",
                icon: RiAlertFill,
                isSelected: (block) => block.type === "alert",
              } satisfies BlockTypeSelectItem,
            ]}
          />
        )}
      />
      {/* Replaces the default Slash Menu. */}
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) => {
          // Gets all default slash menu items.
          const defaultItems = getDefaultReactSlashMenuItems(editor);
          // Finds index of last item in "Basic blocks" group.
          const lastBasicBlockIndex = defaultItems.findLastIndex(
            (item) => item.group === "Basic blocks"
          );
          // Inserts the Alert item as the last item in the "Basic blocks" group.
          defaultItems.splice(lastBasicBlockIndex + 1, 0, insertAlert(editor));

          // Returns filtered items based on the query.
          return filterSuggestionItems(defaultItems, query);
        }}
      />
    </BlockNoteView>
  );
}
