import "@blocknote/core/fonts/inter.css";
import {
  BlockNoteSchema,
  SourceBlockWithPreviewExtension,
} from "@blocknote/core";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import { TextSelection } from "prosemirror-state";
import { syntaxHighlighter } from "@blocknote/code-block";
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
  onItemClick: () => {
    const block = insertOrUpdateBlockForSlashMenu(editor, {
      type: "math",
    });

    // Move the selection inside the new block and open the popup.
    editor.setTextCursorPosition(block.id, "end");
    editor
      .getExtension(SourceBlockWithPreviewExtension)
      ?.store.setState((state) => ({ ...state, popupOpen: block.id }));
    editor.focus();
  },
  aliases: ["math", "latex", "formula", "equation"],
  group: "Advanced",
  icon: <TbMathFunction />,
});

// Slash menu item to insert an inline Math equation.
const insertInlineMath = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Inline Equation",
  subtext: "Insert an inline LaTeX equation",
  onItemClick: () => {
    const view = editor.prosemirrorView!;
    const insertPos = view.state.selection.from;

    editor.insertInlineContent([
      { type: "inlineMath", content: "" },
      // Adds a trailing space so the cursor can leave the equation.
      " ",
    ]);

    // Move the selection inside the new block and open the popup.
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.create(view.state.doc, insertPos + 1),
      ),
    );
    editor.focus();
  },
  aliases: ["math", "latex", "formula", "equation"],
  group: "Advanced",
  icon: <TbMathFunction />,
});

export default function App() {
  const editor = useCreateBlockNote({
    // The syntax highlighter extension highlights the LaTeX source of math
    // blocks (they declare `highlight: () => "latex"`). Without it, they render
    // as plain text.
    extensions: [syntaxHighlighter],
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
