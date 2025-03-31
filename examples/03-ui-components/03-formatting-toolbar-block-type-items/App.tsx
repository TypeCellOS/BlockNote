import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbarController,
  blockTypeSelectItems,
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
        type: "paragraph",
        content:
          "Try selecting some text - you'll see the new 'Alert' item in the Block Type Select",
      },
      {
        type: "alert",
        content:
          "Or select text in this alert - the Block Type Select also appears",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
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
    </BlockNoteView>
  );
}
