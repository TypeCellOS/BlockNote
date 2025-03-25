import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
// This packages some of the most used languages in on-demand bundle
import { codeBlock } from "@blocknote/code-block";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    codeBlock,
    initialContent: [
      {
        id: "fc832df4-bd15-49d2-8d64-140c27f29692",
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
        children: [],
      },
      {
        id: "aecf786b-cbde-4915-b86c-b4c8264fc8f7",
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [],
        children: [],
      },
      {
        id: "f85ab261-dfe8-47f0-929f-533808a4184d",
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
        children: [],
      },
      {
        id: "dec03378-6b49-442a-89f0-b2551ce0f60c",
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [],
        children: [],
      },
    ],
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
