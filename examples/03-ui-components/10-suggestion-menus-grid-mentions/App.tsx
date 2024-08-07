import {
  BlockNoteSchema,
  defaultInlineContentSpecs,
  filterSuggestionItems,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  DefaultReactGridSuggestionItem,
  GridSuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";

import { Mention } from "./Mention";

// Our schema with inline content specs, which contain the configs and
// implementations for inline content  that we want our editor to use.
const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    // Adds all default inline content.
    ...defaultInlineContentSpecs,
    // Adds the mention tag.
    mention: Mention,
  },
});

// Function which gets all users for the mentions menu.
const getMentionMenuItems = (
  editor: typeof schema.BlockNoteEditor
): DefaultReactGridSuggestionItem[] => {
  const users = ["Steve", "Bob", "Joe", "Mike"];

  return users.map((user) => ({
    id: user,
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: "mention",
          props: {
            user,
          },
        },
        " ", // add a space after the mention
      ]);
    },
    icon: <p>{user.substring(0, 1)}</p>,
  }));
};

export function App() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "mention",
            props: {
              user: "Steve",
            },
          },
          {
            type: "text",
            text: " <- This is an example mention",
            styles: {},
          },
        ],
      },
      {
        type: "paragraph",
        content: "Press the '@' key to open the mentions menu and add another",
      },
      {
        type: "paragraph",
      },
    ],
  });

  return (
    <BlockNoteView editor={editor}>
      {/* Adds a mentions menu which opens with the "@" key */}
      <GridSuggestionMenuController
        triggerCharacter={"@"}
        getItems={async (query) =>
          // Gets the mentions menu items
          // TODO: Fix map/type cast
          filterSuggestionItems(
            getMentionMenuItems(editor).map((item) => ({
              ...item,
              title: item.id,
            })),
            query
          ) as DefaultReactGridSuggestionItem[]
        }
        columns={2}
        minQueryLength={2}
      />
    </BlockNoteView>
  );
}

export default App;
