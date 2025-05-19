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
  AIMenuController,
  AIToolbarButton,
  locales as aiLocales,
  createAIExtension,
  createBlockNoteAIClient,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import "@blocknote/xl-ai/style.css";
import { useEffect, useState } from "react";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
import { getEnv } from "./getEnv.js";

import "./styles.css";
// eslint-disable-next-line import/no-extraneous-dependencies
import { EditorView } from "prosemirror-view";

const params = new URLSearchParams(window.location.search);
const ghostWritingRoom = params.get("room");
const ghostWriterIndex = parseInt(params.get("index") || "1");
const isGhostWriting = Boolean(ghostWritingRoom);
const roomName = ghostWritingRoom || `ghost-writer-${Date.now()}`;
// Sets up Yjs document and PartyKit Yjs provider.
const doc = new Y.Doc();
const provider = new YPartyKitProvider(
  "blocknote-dev.yousefed.partykit.dev",
  // Use a unique name as a "room" for your application.
  roomName,
  doc,
);

/**
 * Y-prosemirror has an optimization, where it doesn't send awareness updates unless the editor is currently focused.
 * So, for the ghost writers, we override the hasFocus method to always return true.
 */
if (isGhostWriting) {
  EditorView.prototype.hasFocus = () => true;
}

const ghostContent =
  "This demo shows a two-way sync of documents. It allows you to test collaboration features, and see how stable the editor is. ";

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
  const [numGhostWriters, setNumGhostWriters] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const editor = useCreateBlockNote({
    collaboration: {
      // The Yjs Provider responsible for transporting updates:
      provider,
      // Where to store BlockNote data in the Y.Doc:
      fragment: doc.getXmlFragment("document-store"),
      // Information (name and color) for this user:
      user: {
        name: isGhostWriting
          ? `Ghost Writer #${ghostWriterIndex}`
          : "My Username",
        color: isGhostWriting ? "#CCCCCC" : "#00ff00",
      },
    },
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

  useEffect(() => {
    if (!isGhostWriting || isPaused) {
      return;
    }
    let index = 0;
    let timeout: NodeJS.Timeout;

    const scheduleNextChar = () => {
      const jitter = Math.random() * 200; // Random delay between 0-200ms
      timeout = setTimeout(() => {
        const firstBlock = editor.document?.[0];
        if (firstBlock) {
          editor.insertInlineContent(ghostContent[index], {
            updateSelection: true,
          });
          index = (index + 1) % ghostContent.length;
        }
        scheduleNextChar();
      }, 50 + jitter);
    };

    scheduleNextChar();

    return () => clearTimeout(timeout);
  }, [editor, isPaused]);

  // Renders the editor instance.
  return (
    <>
      {isGhostWriting ? (
        <button onClick={() => setIsPaused((a) => !a)}>
          {isPaused ? "Resume Ghost Writer" : "Pause Ghost Writer"}
        </button>
      ) : (
        <>
          <button onClick={() => setNumGhostWriters((a) => a + 1)}>
            Add a Ghost Writer
          </button>
          <button onClick={() => setNumGhostWriters((a) => a - 1)}>
            Remove a Ghost Writer
          </button>
          <button
            onClick={() => {
              window.open(
                `${window.location.origin}${window.location.pathname}?room=${roomName}&index=-1`,
                "_blank",
              );
            }}
          >
            Ghost Writer in a new window
          </button>
        </>
      )}
      <BlockNoteView
        editor={editor}
        // We're disabling some default UI elements
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

      {!isGhostWriting && (
        <div className="two-way-sync">
          {Array.from({ length: numGhostWriters }).map((_, index) => (
            <iframe
              src={`${window.location.origin}${
                window.location.pathname
              }?room=${roomName}&index=${index + 1}&hideMenu=true`}
              title="ghost writer"
              className="ghost-writer"
            />
          ))}
        </div>
      )}
    </>
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
