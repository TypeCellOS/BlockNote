import {
  AIBlock,
  AIBlockToolbarProsemirrorPlugin,
  AIButton,
  AIShowSelectionPlugin,
  BlockNoteAIContextProvider,
  BlockNoteAIUI,
  aiBlockTypeSelectItems,
  locales as aiLocales,
  createBlockNoteAIClient,
  getAISlashMenuItems,
  useBlockNoteAIContext,
} from "@blocknote/xl-ai";

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
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
import { useMemo, useState } from "react";
import { BasicAutocomplete } from "./AutoComplete.js";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    ai: AIBlock,
  },
});

const client = createBlockNoteAIClient({
  apiKey: "PLACEHOLDER",
  baseURL: "https://localhost:3000/ai",
});

export default function App() {
  const [aiModelString, setAiModelString] = useState(
    "openai/gpt-4o-2024-08-06"
  );
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

  const model = useMemo(() => {
    const [provider, modelName] = aiModelString.split("/");
    if (provider === "openai") {
      return createOpenAI({
        ...client.getProviderSettings("openai"),
      })("gpt-4o-2024-08-06", {});
    } else if (provider === "groq") {
      return createGroq({
        ...client.getProviderSettings("groq"),
      })("llama-3.1-70b-versatile");
    }
    throw new Error(`Unknown model: ${aiModelString}`);
  }, [aiModelString]);

  // Renders the editor instance using a React component.
  return (
    <div>
      <BasicAutocomplete value={aiModelString} onChange={setAiModelString} />
      <BlockNoteView
        editor={editor}
        formattingToolbar={false}
        slashMenu={false}>
        <BlockNoteAIContextProvider model={model}>
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
    </div>
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
