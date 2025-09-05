import { BlockNoteSchema, createCodeBlockSpec } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { createMathBlockSpec } from "@blocknote/math";
import "katex/dist/katex.min.css";
import { useEffect } from "react";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema: BlockNoteSchema.create().extend({
      blockSpecs: {
        math: createMathBlockSpec(),
      },
    }),
    initialContent: [
      {
        type: "paragraph",
        content: "Checkout this math!",
      },
      {
        type: "math",
        props: {
          expression: "2x^2",
        },
      },
      {
        type: "paragraph",
      },
    ],
  });
  useEffect(() => {
    return editor.onChange(() => {
      console.log(editor.blocksToFullHTML(editor.document));
      console.log(editor.blocksToHTMLLossy(editor.document));
    });
  }, []);

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
