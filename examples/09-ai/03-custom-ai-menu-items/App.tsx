import { createGroq } from "@ai-sdk/groq";
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
  AIMenu,
  AIMenuController,
  AIToolbarButton,
  locales as aiLocales,
  createAIExtension,
  createBlockNoteAIClient,
  getAISlashMenuItems,
  getDefaultAIMenuItemsForReview,
  getDefaultAIMenuItemsWithSelection,
  getDefaultAIMenuItemsWithoutSelection,
} from "@blocknote/xl-ai";
import "@blocknote/xl-ai/style.css";
import { getEnv } from "./getEnv.js";

import { addRelatedTopics, makeInformal } from "./customAIMenuItems.js";

// Optional: proxy requests through the `@blocknote/xl-ai-server` proxy server
// so that we don't have to expose our API keys to the client
const client = createBlockNoteAIClient({
  apiKey: getEnv("BLOCKNOTE_AI_SERVER_API_KEY") || "PLACEHOLDER",
  baseURL:
    getEnv("BLOCKNOTE_AI_SERVER_BASE_URL") || "https://localhost:3000/ai",
});

// Use an "open" model such as llama, in this case via groq.com
const model = createGroq({
  // call via our proxy client
  ...client.getProviderSettings("groq"),
})("llama-3.3-70b-versatile");

/* 
ALTERNATIVES:

Call a model directly (without the proxy):

const model = createGroq({
  apiKey: "<YOUR_GROQ_API_KEY>",
})("llama-3.3-70b-versatile");

Or, use a different provider like OpenAI:

const model = createOpenAI({
  ...client.getProviderSettings("openai"),
})("gpt-4", {});
*/

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
        model,
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

  // Renders the editor instance using a React component.
  return (
    <div>
      <BlockNoteView
        editor={editor}
        formattingToolbar={false}
        slashMenu={false}
      >
        {/* Creates a new AIMenu with the default items, 
        as well as our custom ones. */}
        <AIMenuController aiMenu={CustomAIMenu} />

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

function CustomAIMenu() {
  return (
    <AIMenu
      items={(
        editor: BlockNoteEditor<any, any, any>,
        aiResponseStatus:
          | "user-input"
          | "thinking"
          | "ai-writing"
          | "error"
          | "user-reviewing"
          | "closed",
      ) => {
        if (aiResponseStatus === "user-input") {
          // Returns different items based on whether the AI Menu was
          // opened via the Formatting Toolbar or the Slash Menu.
          if (editor.getSelection()) {
            return [
              // Gets the default AI Menu items for when it's opened via
              // the Formatting Toolbar.
              ...getDefaultAIMenuItemsWithSelection(editor),
              // Adds our custom item to make the text more casual.
              // Only appears when the AI Menu is opened via the
              // Formatting Toolbar.
              makeInformal(editor),
            ];
          } else {
            return [
              // Gets the default AI Menu items for when it's opened
              // via the Slash Menu.
              ...getDefaultAIMenuItemsWithoutSelection(editor),
              // Adds our custom item to find related topics. Only
              // appears when the AI Menu is opened via the Slash
              // Menu.
              addRelatedTopics(editor),
            ];
          }
        }

        if (aiResponseStatus === "user-reviewing") {
          // Returns different items once the AI has finished writing,
          // so the user can choose to accept or reject the changes.
          return getDefaultAIMenuItemsForReview(editor);
        }

        // Return no items in other states, e.g. when the AI is writing
        // or when an error occurred.
        return [];
      }}
    />
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
