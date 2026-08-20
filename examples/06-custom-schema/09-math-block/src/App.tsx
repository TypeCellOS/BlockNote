import "@blocknote/core/fonts/inter.css";
import { BlockNoteSchema, combineByGroup } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import * as locales from "@blocknote/core/locales";
import { syntaxHighlighter } from "@blocknote/code-block";
import {
  createReactInlineMathSpec,
  createReactMathBlockSpec,
  getMathBlockTypeSelectItems,
  getMathSlashMenuItems,
  locales as mathLocales,
} from "@blocknote/math-block";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  blockTypeSelectItems,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";

// Our schema with block specs, which contain the configs and implementations for blocks
// that we want our editor to use.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    // Creates an instance of the Math block and adds it to the schema.
    mathBlock: createReactMathBlockSpec(),
  },
  inlineContentSpecs: {
    // Creates an instance of the inline Math content and adds it to the schema.
    math: createReactInlineMathSpec(),
  },
});

export default function App() {
  const editor = useCreateBlockNote({
    // The syntax highlighter extension highlights the LaTeX source of math
    // blocks (they declare `highlight: () => "latex"`). Without it, they render
    // as plain text.
    extensions: [syntaxHighlighter],
    schema,
    // Merges the default dictionary with the math dictionary, under the `math`
    // key the math block/inline content read their strings from.
    dictionary: {
      ...locales.en,
      math: mathLocales.en,
    },
    initialContent: [
      {
        type: "paragraph",
        content: "Click a formula to edit its LaTeX source:",
      },
      {
        type: "mathBlock",
        content: "a^2 = \\sqrt{b^2 + c^2}",
      },
      {
        type: "mathBlock",
        content: "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
      },
      {
        type: "paragraph",
        content: [
          "Equations can also be inline, like ",
          { type: "math", content: "e^{i\\pi} + 1 = 0" },
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
    <BlockNoteView editor={editor} slashMenu={false} formattingToolbar={false}>
      {/* Replaces the default Formatting Toolbar, adding the Math block to the
          block type select so blocks can be converted to it. */}
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar
            blockTypeSelectItems={[
              ...blockTypeSelectItems(editor.dictionary),
              ...getMathBlockTypeSelectItems(editor),
            ]}
          />
        )}
      />
      {/* Replaces the default Slash Menu. */}
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) => {
          // Gets the default slash menu items and adds the Math items at the
          // end of their group ("Advanced").
          const items = combineByGroup(
            getDefaultReactSlashMenuItems(editor),
            getMathSlashMenuItems(editor),
          );

          // Returns filtered items based on the query.
          return filterSuggestionItems(items, query);
        }}
      />
    </BlockNoteView>
  );
}
