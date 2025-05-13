/// <reference types="./vite-env.d.ts" />

import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  AIToolbarButton,
  BlockNoteAIUI,
  locales as aiLocales,
  createAIExtension,
  createBlockNoteAIClient,
  getAIExtension,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import "@blocknote/xl-ai/style.css";
import { Fieldset, Switch } from "@mantine/core";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { BasicAutocomplete } from "./AutoComplete.js";
import RadioGroupComponent from "./components/RadioGroupComponent.js";

// Optional: proxy requests through the `@blocknote/xl-ai-server` proxy server
// so that we don't have to expose our API keys to the client
const client = createBlockNoteAIClient({
  apiKey: import.meta.env.VITE_BLOCKNOTE_AI_SERVER_API_KEY || "PLACEHOLDER",
  baseURL:
    import.meta.env.VITE_BLOCKNOTE_AI_SERVER_BASE_URL ||
    "https://localhost:3000/ai",
});

function getModel(aiModelString: string) {
  const [provider, ...modelNameParts] = aiModelString.split("/");
  const modelName = modelNameParts.join("/");
  if (provider === "openai.chat") {
    return createOpenAI({
      ...client.getProviderSettings("openai"),
    })(modelName, {});
  } else if (provider === "groq.chat") {
    return createGroq({
      ...client.getProviderSettings("groq"),
    })(modelName);
  } else if (provider === "albert-etalab.chat") {
    return createOpenAI({
      // albert-etalab/neuralmagic/Meta-Llama-3.1-70B-Instruct-FP8
      baseURL: "https://albert.api.staging.etalab.gouv.fr/v1",
      ...client.getProviderSettings("albert-etalab"),
      compatibility: "compatible",
    })(modelName);
  }
  throw new Error(`Unknown model: ${aiModelString}`);
}
export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiLocales.en, // add default translations for the AI extension
    },
    // Register the AI extension
    extensions: [
      createAIExtension({
        model: getModel("openai.chat/gpt-4o"), // TODO
      }),
    ],
    // We set some initial content for demo purposes
    initialContent: [
      {
        type: "heading",
        props: {
          level: 1,
        },
        content: "I love cats",
      },
      {
        type: "paragraph",
        content:
          "Cats are one of the most beloved and fascinating animals in the world. Known for their agility, independence, and charm, cats have been companions to humans for thousands of years. Domesticated cats, scientifically named Felis catus, come in various breeds, colors, and personalities, making them a popular choice for pet owners everywhere. Their mysterious behavior, sharp reflexes, and quiet affection have earned them a special place in countless households.",
      },
      {
        type: "paragraph",
        content:
          "Beyond their role as pets, cats have a rich history and cultural significance. In ancient Egypt, they were revered and even worshipped as symbols of protection and grace. Throughout history, they’ve appeared in folklore, art, and literature, often associated with curiosity, luck, and mystery. Despite superstitions surrounding black cats in some cultures, many societies around the world admire and cherish these sleek and graceful animals.",
      },
      {
        type: "paragraph",
        content:
          "Cats also offer emotional and physical benefits to their owners. Studies have shown that interacting with cats can reduce stress, lower blood pressure, and improve mental well-being. Their gentle purring, playful antics, and warm companionship provide comfort to people of all ages. Whether lounging in the sun, chasing a toy, or curling up on a lap, cats bring joy, peace, and a bit of magic to the lives of those who welcome them into their homes.",
      },
    ],
  });

  const ai = getAIExtension(editor);
  // TBD: we now derive this from the LLM extension options. desirable?

  const [modelString, setModelString] = useState<string>(
    () =>
      ai.options.getState().model.provider +
      "/" +
      ai.options.getState().model.modelId,
  );
  // TODO: fix typing in autocompletion box
  // const model = useStore(ai.options, (state) => state.model);

  // const modelString = model.provider + "/" + model.modelId;

  useEffect(() => {
    const model = getModel(modelString);
    if (!model) {
      console.warn(`Unknown model: ${modelString}`);
      return;
    }
    ai.options.setState({ model });
  }, [modelString, ai.options]);

  const dataFormat = useStore(ai.options, (state) => state.dataFormat);
  const stream = useStore(ai.options, (state) => state.stream);

  return (
    <div>
      <Fieldset legend="Model settings" style={{ maxWidth: "500px" }}>
        <BasicAutocomplete value={modelString} onChange={setModelString} />
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
          onChange={(value) =>
            ai.options.setState({ dataFormat: value as "json" | "markdown" })
          }
        />

        <Switch
          checked={stream}
          onChange={(e) => ai.options.setState({ stream: e.target.checked })}
          label="Streaming"
        />
      </Fieldset>

      <BlockNoteView
        editor={editor}
        formattingToolbar={false}
        slashMenu={false}>
        {/* This has AI specific components like the AI Command menu */}
        <BlockNoteAIUI />

        {/* We disabled the default formatting toolbar with `formattingToolbar=false` 
        and replace it for one with an "AI button" (defined below). 
        (See "Formatting Toolbar" in docs)
        */}
        <FormattingToolbarWithAI />

        {/* We disabled the default SlashMenu with `slashMenu=false` 
        and replace it for one with an AI option (defined below). 
        (See "Suggestion Menus" in docs)
        */}
        <SuggestionMenuWithAI editor={editor} />
      </BlockNoteView>
    </div>
  );
}

// Formatting toolbar with the `AIToolbarButton` added
function FormattingToolbarWithAI() {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          {...getFormattingToolbarItems()}
          <AIToolbarButton />
        </FormattingToolbar>
      )}
    />
  );
}

// Slash menu with the AI option added
function SuggestionMenuWithAI(props: {
  editor: BlockNoteEditor<any, any, any>;
}) {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(props.editor),
            ...getAISlashMenuItems(props.editor),
          ],
          query,
        )
      }
    />
  );
}
