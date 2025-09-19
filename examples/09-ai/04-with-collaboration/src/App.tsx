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
  ClientSideTransport,
  createAIExtension,
  createBlockNoteAIClient,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import { useEffect, useState } from "react";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
// eslint-disable-next-line import/no-extraneous-dependencies
import { EditorView } from "prosemirror-view";

import { getEnv } from "./getEnv";
import "./styles.css";

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
    (getEnv("BLOCKNOTE_AI_SERVER_BASE_URL") || "https://localhost:3000/ai") +
    "/proxy",
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
      ai: aiEn, // add default translations for the AI extension
    },
    // Register the AI extension
    extensions: [
      createAIExtension({
        transport: new ClientSideTransport({
          model,
        }),
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
