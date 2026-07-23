import {
  BlockNoteSchema,
  createCodeBlockSpec,
  SyntaxHighlightingExtension,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
// Bundle created from `npx shiki-codegen --langs typescript,javascript,react --themes light-plus,dark-plus --engine javascript --precompiled ./shiki.bundle.ts`
import { createHighlighter } from "./shiki.bundle";

// Syntax highlighting is a separate extension, configured with a highlighter.
// Here we build one from our own custom Shiki bundle (with `dark-plus` /
// `light-plus` themes) and pass it to the editor's `extensions` below.
const syntaxHighlighter = SyntaxHighlightingExtension({
  // This creates a highlighter, it can be asynchronous to load it afterwards
  createHighlighter: () =>
    createHighlighter({
      themes: ["dark-plus", "light-plus"],
      langs: [],
    }),
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    extensions: [syntaxHighlighter],
    schema: BlockNoteSchema.create().extend({
      blockSpecs: {
        codeBlock: createCodeBlockSpec({
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
        }),
      },
    }),
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
    ],
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
