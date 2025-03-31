import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
// Bundle created from `npx shiki-codegen --langs typescript,javascript,react --themes light-plus,dark-plus --engine javascript --precompiled ./shiki.bundle.ts`
import { createHighlighter } from "./shiki.bundle.js";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    codeBlock: {
      indentLineWithTab: true,
      defaultLanguage: "typescript",
      supportedLanguages: {
        typescript: {
          name: "TypeScript",
          aliases: ["ts"],
        },
        javascript: {
          name: "JavaScript",
          aliases: ["js"],
        },
        vue: {
          name: "Vue",
        },
      },
      // This creates a highlighter, it can be asynchronous to load it afterwards
      createHighlighter: () =>
        createHighlighter({
          themes: ["dark-plus", "light-plus"],
          langs: [],
        }),
    },
    initialContent: [
      {
        type: "codeBlock",
        props: {
          language: "typescript",
        },
        content: [
          {
            type: "text",
            text: "const x = 3 * 4;",
            styles: {},
          },
        ],
      },
      {
        type: "paragraph",
      },
      {
        type: "heading",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
          level: 3,
        },
        content: [
          {
            type: "text",
            text: 'Click on "Typescript" above to see the different supported languages',
            styles: {},
          },
        ],
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
