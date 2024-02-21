import {
  BlockNoteEditor,
  DefaultBlockSchema,
  defaultInlineContentSpecs,
  filterSuggestionItems,
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
} from "@blocknote/core";
import {
  BlockNoteDefaultUI,
  BlockNoteView,
  DefaultReactSuggestionItem,
  SuggestionMenuController,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { MentionInlineContent } from "./MentionInlineContent";

const customInlineContentSpecs = {
  ...defaultInlineContentSpecs,
  mention: MentionInlineContent,
} satisfies InlineContentSpecs;

type CustomInlineContentSchema = InlineContentSchemaFromSpecs<
  typeof customInlineContentSpecs
>;

function getMentionMenuItems(
  editor: BlockNoteEditor<DefaultBlockSchema, CustomInlineContentSchema>
): DefaultReactSuggestionItem<DefaultBlockSchema, CustomInlineContentSchema>[] {
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
  const editor = useBlockNote({
    inlineContentSpecs: customInlineContentSpecs,
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
