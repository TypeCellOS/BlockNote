import "@blocknote/core/fonts/inter.css";
import { BlockNoteSchema } from "@blocknote/core";
import { createHighlighter } from "@blocknote/code-block";
import { createMathBlockSpec } from "@blocknote/math-block";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

export default function App() {
  // The math block isn't a default block, so we register it in a custom schema.
  const editor = useCreateBlockNote({
    // The Shiki highlighter (from @blocknote/code-block) syntax-highlights the
    // math block's editable LaTeX source popup. `highlightBlock` enables it for
    // the math block and highlights it as LaTeX.
    syntaxHighlighting: {
      createHighlighter,
      highlightBlock: (block) =>
        block.type === "math" ? "latex" : block.props.language,
    },
    schema: BlockNoteSchema.create().extend({
      blockSpecs: {
        math: createMathBlockSpec(),
      },
    }),
    initialContent: [
      {
        type: "paragraph",
        content: "Click a formula to edit its LaTeX source:",
      },
      {
        type: "math",
        content: "a^2 = \\sqrt{b^2 + c^2}",
      },
      {
        type: "math",
        content: "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
