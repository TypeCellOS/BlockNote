import { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
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
  useExtension,
  usePrefersColorScheme,
} from "@blocknote/react";
import {
  AIExtension,
  AIMenuController,
  AIToolbarButton,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import { Fieldset, MantineProvider } from "@mantine/core";
import { useEffect, useState } from "react";

import { DefaultChatTransport } from "ai";
import { BasicAutocomplete } from "./AutoComplete";
import { getEnv } from "./getEnv";

const BASE_URL =
  getEnv("BLOCKNOTE_AI_SERVER_BASE_URL") || "https://localhost:3000/ai";

export default function App() {
  const [model, setModel] = useState<string>(
    "groq.chat/llama-3.3-70b-versatile",
  );

  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn, // add default translations for the AI extension
    },
    // Register the AI extension
    extensions: [AIExtension],
    ai: {
      transport: new DefaultChatTransport({
        // URL to your backend API, see example source in `packages/xl-ai-server/src/routes/regular.ts`
        api: `${BASE_URL}/model-playground/streamText`,
      }),
    },
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

  const ai = useExtension(AIExtension, { editor });

  useEffect(() => {
    // update the default model in the extension

    // Add the model string to the request body
    ai.options.setState({
      chatRequestOptions: {
        body: {
          model,
        },
      },
    });
  }, [model, ai]);

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
              error={!model ? "Unknown model" : undefined}
              value={model}
              onChange={setModel}
            />
          </Fieldset>
        </div>
      </MantineProvider>

      <BlockNoteView
        editor={editor}
        formattingToolbar={false}
        slashMenu={false}
        style={{ paddingBottom: "300px" }}
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
