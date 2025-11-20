import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  AIMenuController,
  AIToolbarButton,
  createAIAutoCompleteExtension,
  createAIExtension,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";

import { DefaultChatTransport } from "ai";
import { getEnv } from "./getEnv";

const BASE_URL =
  getEnv("BLOCKNOTE_AI_SERVER_BASE_URL") || "https://localhost:3000/ai";

/**
 * Fetches suggestions for the auto complete plugin from our backend API.
 */
async function autoCompleteProvider(
  editor: BlockNoteEditor<any, any, any>,
  signal: AbortSignal,
) {
  // TODO:
  // - API is very prosemirror-based, make something more BlockNote-native
  // - Add simple method to retrieve relevant context (e.g. block content / json until selection)

  const state = editor.prosemirrorState;
  const text = state.doc.textBetween(
    state.selection.from - 300,
    state.selection.from,
  );

  const response = await fetch(
    "https://blocknote-pr-2191.onrender.com/ai/autocomplete/generateText",
    // `https://localhost:3000/ai/autocomplete/generateText`,
    {
      method: "POST",
      body: JSON.stringify({ text }),
      signal,
    },
  );
  const data = await response.json();
  return data.suggestions.map((suggestion: string) => ({
    position: state.selection.from,
    suggestion: suggestion,
  }));
  //   return [
  //     {
  //       position: state.selection.from,
  //       suggestion: "Hello World",
  //     },
  //     {
  //       position: state.selection.from,
  //       suggestion: "Hello Planet",
  //     },
  //   ];
}

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn, // add default translations for the AI extension
    },
    // Register the AI extension
    extensions: [
      createAIExtension({
        transport: new DefaultChatTransport({
          // URL to your backend API, see example source in `packages/xl-ai-server/src/routes/regular.ts`
          api: `${BASE_URL}/regular/streamText`,
        }),
      }),
      createAIAutoCompleteExtension({ autoCompleteProvider }),
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

  // Renders the editor instance using a React component.
  return (
    <div>
      <BlockNoteView
        editor={editor}
        // We're disabling some default UI elements
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
          {/* Add the AI button */}
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
            // add the default AI slash menu items, or define your own
            ...getAISlashMenuItems(props.editor),
          ],
          query,
        )
      }
    />
  );
}
