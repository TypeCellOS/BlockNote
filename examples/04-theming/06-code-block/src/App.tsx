import { BlockNoteSchema, createCodeBlockSpec } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
// This packages some of the most used languages in on-demand bundle, and a
// ready-to-use syntax highlighter extension configured with them.
import { codeBlockOptions, syntaxHighlighter } from "@blocknote/code-block";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    // Adding the syntax highlighter extension enables syntax highlighting for
    // the code block. Without it, code renders as plain text.
    extensions: [syntaxHighlighter],
    schema: BlockNoteSchema.create().extend({
      blockSpecs: {
        codeBlock: createCodeBlockSpec(codeBlockOptions),
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
