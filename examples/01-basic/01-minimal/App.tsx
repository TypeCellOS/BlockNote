import {
  AIBlock,
  AIBlockToolbarProsemirrorPlugin,
  AIButton,
  AIInlineToolbarProsemirrorPlugin,
  BlockNoteAIContextProvider,
  BlockNoteAIUI,
  aiBlockTypeSelectItems,
  en as aiEN,
  getAISlashMenuItems,
  useBlockNoteAIContext,
} from "@blocknote/ai";

import "@blocknote/ai/style.css";
import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
  en,
  filterSuggestionItems,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
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
    ...defaultBlockSpecs,
    ai: AIBlock,
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
      <BlockNoteAIContextProvider>
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
        <SuggestionMenu editor={editor} />
      </BlockNoteAIContextProvider>
      {/* TODO: Side Menu customization */}
    </BlockNoteView>
  );
}

function SuggestionMenu(props: { editor: BlockNoteEditor<any, any, any> }) {
  const ctx = useBlockNoteAIContext();
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(props.editor),
            ...getAISlashMenuItems(props.editor as any, ctx), // TODO
          ],
          query
        )
      }
    />
  );
}
