import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import {
  AIAutoCompleteExtension
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";

import { getEnv } from "./getEnv";

const BASE_URL =
  getEnv("BLOCKNOTE_AI_SERVER_BASE_URL") || "https://localhost:3000/ai";

export default function App() {
  // Creates a new editor instance with AI autocomplete enabled
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn,
    },
    // Register the AI Autocomplete extension
    extensions: [
      AIAutoCompleteExtension({
        provider: `${BASE_URL}/autocomplete/generateText`,
      }),
    ],
    // We set some initial content for demo purposes
    initialContent: [
      {
        type: "heading",
        props: {
          level: 1,
        },
        content: "AI Autocomplete Demo",
      },
      {
        type: "paragraph",
        content:
          "Start typing and the AI will suggest completions based on the current context. When suggestions appear, you can press Tab to accept the suggestion.",
      },
      {
        type: "paragraph",
        content:
          "For example, type at the end of this sentence. Open source software is: ",
      },
      {
        type: "paragraph",
        content: "",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return (
    <div>
      <BlockNoteView
        editor={editor}
        style={{ paddingBottom: "300px" }}
      />
    </div>
  );
}
