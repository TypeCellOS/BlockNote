import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import "@mantine/core/styles.css";
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
  useBlockNoteContext,
  useCreateBlockNote,
  usePrefersColorScheme,
} from "@blocknote/react";
import {
  AIMenuController,
  AIToolbarButton,
  createAIExtension,
  createBlockNoteAIClient,
  getAIExtension,
  getAISlashMenuItems,
  llmFormats,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import { Fieldset, MantineProvider, Switch } from "@mantine/core";


import { LanguageModelV1 } from "ai";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { BasicAutocomplete } from "./AutoComplete.js";
import RadioGroupComponent from "./components/RadioGroupComponent.js";
import { getEnv } from "./getEnv.js";
// Optional: proxy requests through the `@blocknote/xl-ai-server` proxy server
// so that we don't have to expose our API keys to the client
const client = createBlockNoteAIClient({
  apiKey: getEnv("BLOCKNOTE_AI_SERVER_API_KEY") || "PLACEHOLDER",
  baseURL:
    getEnv("BLOCKNOTE_AI_SERVER_BASE_URL") || "https://localhost:3000/ai",
});

// return the AI SDK model based on the selected model string
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
    return createOpenAICompatible({
      name: "albert-etalab",
      baseURL: "https://albert.api.etalab.gouv.fr/v1",
      ...client.getProviderSettings("albert-etalab"),
    })(modelName);
  } else if (provider === "mistral.chat") {
    return createMistral({
      ...client.getProviderSettings("mistral"),
    })(modelName);
  } else if (provider === "anthropic.chat") {
    return createAnthropic({
      ...client.getProviderSettings("anthropic"),
    })(modelName);
  } else if (provider === "google.generative-ai") {
    return createGoogleGenerativeAI({
      ...client.getProviderSettings("google"),
    })(modelName, {
      structuredOutputs: false,
    });
  } else {
    return "unknown-model" as const;
  }
}

export default function App() {
  const [modelString, setModelString] = useState<string>(
    "groq.chat/llama-3.3-70b-versatile",
  );

  const model = useMemo(() => {
    return getModel(modelString);
  }, [modelString]);

  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn, // add default translations for the AI extension
    },
    // Register the AI extension
    extensions: [
      createAIExtension({
        model: model as LanguageModelV1, // (type because initially it's valid)
      }),
    ],
    // We set some initial content for demo purposes
    initialContent: [
      {
        type: "heading",
        props: {
          level: 1,
        },
        content: "Open source software",
      },
      {
        type: "paragraph",
        content:
          "Open source software refers to computer programs whose source code is made available to the public, allowing anyone to view, modify, and distribute the code. This model stands in contrast to proprietary software, where the source code is kept secret and only the original creators have the right to make changes. Open projects are developed collaboratively, often by communities of developers from around the world, and are typically distributed under licenses that promote sharing and openness.",
      },
      {
        type: "paragraph",
        content:
          "One of the primary benefits of open source is the promotion of digital autonomy. By providing access to the source code, these programs empower users to control their own technology, customize software to fit their needs, and avoid vendor lock-in. This level of transparency also allows for greater security, as anyone can inspect the code for vulnerabilities or malicious elements. As a result, users are not solely dependent on a single company for updates, bug fixes, or continued support.",
      },
      {
        type: "paragraph",
        content:
          "Additionally, open development fosters innovation and collaboration. Developers can build upon existing projects, share improvements, and learn from each other, accelerating the pace of technological advancement. The open nature of these projects often leads to higher quality software, as bugs are identified and fixed more quickly by a diverse group of contributors. Furthermore, using open source can reduce costs for individuals, businesses, and governments, as it is often available for free and can be tailored to specific requirements without expensive licensing fees.",
      },
    ],
  });

  const ai = getAIExtension(editor);

  useEffect(() => {
    // update the default model in the extension
    if (model !== "unknown-model") {
      ai.options.setState({ model });
    }
  }, [model, ai.options]);

  const [dataFormat, setDataFormat] = useState("html");

  const stream = useStore(ai.options, (state) => state.stream);

  const themePreference = usePrefersColorScheme();
  const existingContext = useBlockNoteContext();

  const theme =
    existingContext?.colorSchemePreference ||
    (themePreference === "no-preference" ? "light" : themePreference);

  return (
    <div>
      <MantineProvider
        cssVariablesSelector=".model-settings"
        getRootElement={() => undefined}
      >
        <div className="model-settings" data-mantine-color-scheme={theme}>
          <Fieldset legend="Model settings" style={{ maxWidth: "500px" }}>
            <BasicAutocomplete
              error={model === "unknown-model" ? "Unknown model" : undefined}
              value={modelString}
              onChange={setModelString}
            />
            <RadioGroupComponent
              label="Data format"
              items={[
                { name: "HTML", description: "HTML", value: "html" },
                {
                  name: "JSON",
                  description: "JSON (experimental)",
                  value: "json",
                },
                {
                  name: "Markdown",
                  description: "Markdown (experimental)",
                  value: "markdown",
                },
              ]}
              value={dataFormat}
              onChange={(value) => {
                const dataFormat =
                  value === "markdown"
                    ? llmFormats._experimental_markdown
                    : value === "json"
                      ? llmFormats._experimental_json
                      : llmFormats.html;
                ai.options.setState({
                  dataFormat,
                });
                setDataFormat(value);
              }}
            />

            <Switch
              checked={stream}
              onChange={(e) =>
                ai.options.setState({ stream: e.target.checked })
              }
              label="Streaming"
            />
          </Fieldset>
        </div>
      </MantineProvider>

      <BlockNoteView
        editor={editor}
        formattingToolbar={false}
        slashMenu={false}
      >
        {/* Add the AI Command menu to the editor */}
        <AIMenuController />

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
