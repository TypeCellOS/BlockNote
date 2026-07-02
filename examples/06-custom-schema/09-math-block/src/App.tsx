import "@blocknote/core/fonts/inter.css";
import { BlockNoteSchema } from "@blocknote/core";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import { createHighlighter } from "@blocknote/code-block";
import {
  createReactInlineMathSpec,
  createReactMathBlockSpec,
} from "@blocknote/math-block";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { TbMathFunction } from "react-icons/tb";

// Our schema with block specs, which contain the configs and implementations for blocks
// that we want our editor to use.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    // Creates an instance of the Math block and adds it to the schema.
    math: createReactMathBlockSpec(),
  },
  inlineContentSpecs: {
    // Creates an instance of the inline Math content and adds it to the schema.
    inlineMath: createReactInlineMathSpec(),
  },
});

// Slash menu item to insert a Math block.
const insertMath = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Math Block",
  subtext: "Insert a LaTeX math formula",
  onItemClick: () =>
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "math",
    }),
  aliases: ["math", "latex", "formula", "equation"],
  group: "Advanced",
  icon: <TbMathFunction />,
});

// Slash menu item to insert an inline Math equation.
const insertInlineMath = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Inline Equation",
  subtext: "Insert an inline LaTeX equation",
  onItemClick: () => {
    editor.insertInlineContent([
      { type: "inlineMath", content: "" },
      // Adds a trailing space so the cursor can leave the equation.
      " ",
    ]);
  },
  aliases: ["math", "latex", "formula", "equation"],
  group: "Advanced",
  icon: <TbMathFunction />,
});

export default function App() {
  const editor = useCreateBlockNote({
    // Configures the syntax highlighting extension to always use LaTeX syntax highlighting in the
    // Math block.
    syntaxHighlighting: {
      createHighlighter,
      highlightBlock: (block) =>
        block.type === "math" ? "latex" : block.props.language,
    },
    schema,
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
        content: [
          "Equations can also be inline, like ",
          { type: "inlineMath", content: "e^{i\\pi} + 1 = 0" },
          ". Click one to edit its LaTeX source.",
        ],
      },
      {
        type: "paragraph",
        content: "Press the '/' key to open the Slash Menu and add another",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      {/* Replaces the default Slash Menu. */}
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) => {
          // Gets all default slash menu items.
          const defaultItems = getDefaultReactSlashMenuItems(editor);
          // Finds index of last item in "Advanced" group.
          const lastAdvancedIndex = defaultItems.findLastIndex(
            (item) => item.group === "Advanced",
          );
          // Inserts the Math items at the end of the "Advanced" group.
          defaultItems.splice(
            lastAdvancedIndex + 1,
            0,
            insertMath(editor),
            insertInlineMath(editor),
          );

          // Returns filtered items based on the query.
          return filterSuggestionItems(defaultItems, query);
        }}
      />
    </BlockNoteView>
  );
}
