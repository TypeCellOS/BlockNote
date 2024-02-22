import {
  BlockNoteSchema,
  defaultInlineContentSpecs,
  filterSuggestionItems,
} from "@blocknote/core";
import {
  BlockNoteDefaultUI,
  BlockNoteView,
  DefaultReactSuggestionItem,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { MentionInlineContent } from "./MentionInlineContent";

const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: MentionInlineContent,
  },
});

function getMentionMenuItems(
  editor: typeof schema.BlockNoteEditor
): DefaultReactSuggestionItem[] {
  const users = ["Steve", "Bob", "Joe", "Mike"];

  return users.map((user) => ({
    title: user,
    onItemClick: () => {
      // TODO: Better API
      editor._tiptapEditor.commands.insertContent({
        type: "mention",
        attrs: {
          user: user,
        },
      });
    },
  }));
}

export function App() {
  const editor = useCreateBlockNote({
    schema,
  });

  return (
    <BlockNoteView editor={editor}>
      <BlockNoteDefaultUI />
      <SuggestionMenuController
        triggerCharacter={"@"}
        getItems={async (query) =>
          filterSuggestionItems(getMentionMenuItems(editor), query)
        }
      />
    </BlockNoteView>
  );
}

export default App;
