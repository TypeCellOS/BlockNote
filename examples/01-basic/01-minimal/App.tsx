import {
  AIBlock,
  AIBlockToolbarProsemirrorPlugin,
  AIButton,
  AIInlineToolbarProsemirrorPlugin,
  BlockNoteAIUI,
  aiBlockTypeSelectItems,
  en as aiEN,
  getAISlashMenuItems,
} from "@blocknote/ai";

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  en,
  filterSuggestionItems,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/ai/style.css";
import {
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  blockTypeSelectItems,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  useCreateBlockNote,
} from "@blocknote/react";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ai: AIBlock,
    ...defaultBlockSpecs,
  },
});
export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema,
    dictionary: {
      ...en,
      ai: aiEN,
    } as any,
    extensions: {
      // TODO: things will break when user provides different keys. Define name on plugins instead?
      aiBlockToolbar: new AIBlockToolbarProsemirrorPlugin(),
      aiInlineToolbar: new AIInlineToolbarProsemirrorPlugin(),
    },
  });

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false} slashMenu={false}>
      <BlockNoteAIUI />
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar>
            {...getFormattingToolbarItems([
              ...blockTypeSelectItems(editor.dictionary),
              ...aiBlockTypeSelectItems(aiEN),
            ])}
            <AIButton />
          </FormattingToolbar>
        )}
      />
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...getDefaultReactSlashMenuItems(editor),
              ...getAISlashMenuItems(editor as any), // TODO
            ],
            query
          )
        }
      />
      {/* TODO: Side Menu customization */}
    </BlockNoteView>
  );
}
