import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  BlockNoteView,
  FormattingToolbar,
  FormattingToolbarController,
  useCreateBlockNote,
  blockTypeSelectItems,
  BlockTypeSelectItem,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import { RiAlertFill } from "react-icons/ri";

import { Alert } from "./Alert";

// Our schema with block specs, which contain the configs and implementations
// for blocks that we want our editor to use.
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

  // Renders the editor instance with the updated Block Type Select.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar
            blockTypeSelectItems={[
              ...blockTypeSelectItems,
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
