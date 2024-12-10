import {
  AIBlock,
  AIBlockToolbarProsemirrorPlugin,
  AIButton,
  AIShowSelectionPlugin,
  BlockNoteAIContextProvider,
  BlockNoteAIUI,
  aiBlockTypeSelectItems,
  locales as aiLocales,
  getAISlashMenuItems,
  useBlockNoteAIContext,
} from "@blocknote/xl-ai";

import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  locales,
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
import "@blocknote/xl-ai/style.css";

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
      ...locales.en,
      ai: aiLocales.en,
    } as any,
    _extensions: {
      // TODO: things will break when user provides different keys. Define name on plugins instead?
      aiBlockToolbar: new AIBlockToolbarProsemirrorPlugin(),
      aiSelection: new AIShowSelectionPlugin(),
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
                ...aiBlockTypeSelectItems(aiLocales.en),
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
