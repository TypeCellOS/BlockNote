import {
  AIToolbarButton,
  BlockNoteAIContextProvider,
  BlockNoteAIUI,
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
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
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
import { Fieldset, Switch } from "@mantine/core";
import { useMemo, useState } from "react";
import { BasicAutocomplete } from "./AutoComplete.js";
import RadioGroupComponent from "./components/RadioGroupComponent.js";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    // ai: AIBlock,
  },
});

const client = createBlockNoteAIClient({
  apiKey: import.meta.env.VITE_BLOCKNOTE_AI_SERVER_API_KEY || "PLACEHOLDER",
  baseURL:
    import.meta.env.VITE_BLOCKNOTE_AI_SERVER_BASE_URL ||
    "https://localhost:3000/ai",
});

export default function App() {
  const [aiModelString, setAiModelString] = useState(
    "openai/gpt-4o-2024-08-06"
  );
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema,
    dictionary: {
      ...en,
      ai: aiLocales.en,
    } as any,
  });

  const model = useMemo(() => {
    const [provider, ...modelNameParts] = aiModelString.split("/");
    const modelName = modelNameParts.join("/");
    if (provider === "openai") {
      return createOpenAI({
        ...client.getProviderSettings("openai"),
      })(modelName, {});
    } else if (provider === "groq") {
      return createGroq({
        ...client.getProviderSettings("groq"),
      })(modelName);
    } else if (provider === "albert-etalab") {
      return createOpenAI({
        // albert-etalab/neuralmagic/Meta-Llama-3.1-70B-Instruct-FP8
        baseURL: "https://albert.api.staging.etalab.gouv.fr/v1",
        ...client.getProviderSettings("albert-etalab"),
        compatibility: "compatible",
      })(modelName);
    }
    throw new Error(`Unknown model: ${aiModelString}`);
  }, [aiModelString]);

  const [dataFormat, setDataFormat] = useState<"json" | "markdown" | "html">(
    "json"
  );

  const [stream, setStream] = useState(true);

  // const stream = dataFormat === "markdown" ? false : streamStateValue;

  // Renders the editor instance using a React component.
  return (
    <div>
      <Fieldset legend="Model settings" style={{ maxWidth: "500px" }}>
        <BasicAutocomplete value={aiModelString} onChange={setAiModelString} />

        <RadioGroupComponent
          label="Data format"
          items={[
            { name: "HTML", description: "HTML format", value: "html" },
            { name: "JSON", description: "JSON format", value: "json" },
            {
              name: "Markdown",
              description: "Markdown format",
              value: "markdown",
            },
          ]}
          value={dataFormat}
          onChange={(value) => setDataFormat(value as "json" | "markdown")}
        />

        <Switch
          checked={stream}
          onChange={(e) => setStream(e.target.checked)}
          label="Streaming"
        />
      </Fieldset>

      <BlockNoteView
        editor={editor}
        formattingToolbar={false}
        slashMenu={false}>
        <BlockNoteAIContextProvider
          model={model}
          dataFormat={dataFormat}
          stream={stream}>
          <BlockNoteAIUI />
          <FormattingToolbarController
            formattingToolbar={() => (
              <FormattingToolbar>
                {...getFormattingToolbarItems([
                  ...blockTypeSelectItems(editor.dictionary),
                  // ...aiBlockTypeSelectItems(aiLocales.en),
                ])}
                <AIToolbarButton />
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
            ...getAISlashMenuItems(props.editor, ctx),
          ],
          query
        )
      }
    />
  );
}

/**
 * - correct commands
 * - FIX UI
 *
 * API:
 * - context (which part of document to pass along)
 * - based on selection
 *
 * - box with proposal
 *
 */
