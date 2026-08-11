import { syntaxHighlighter } from "@blocknote/code-block";
import { BlockNoteSchema, combineByGroup } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import * as locales from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  createReactDiagramBlockSpec,
  getDiagramBlockTypeSelectItems,
  getDiagramSlashMenuItems,
  locales as diagramLocales,
} from "@blocknote/diagram-block";
import {
  blockTypeSelectItems,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";

// Our schema with block specs, which contain the configs and implementations
// for blocks that we want our editor to use.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    // Creates an instance of the Diagram block and adds it to the schema.
    diagram: createReactDiagramBlockSpec(),
  },
});

export default function App() {
  const editor = useCreateBlockNote({
    // The syntax highlighter extension highlights the Diagram block's Mermaid
    // source in its popup (the block declares `highlight: () => "mermaid"`).
    extensions: [syntaxHighlighter],
    schema,
    // Merges the default dictionary with the diagram dictionary, under the
    // `diagram` key the diagram block reads its strings from.
    dictionary: {
      ...locales.en,
      diagram: diagramLocales.en,
    },
    initialContent: [
      {
        type: "paragraph",
        content: "Click a diagram to edit its Mermaid source:",
      },
      {
        type: "diagram",
        content: `graph TD
  A[Write docs] --> B{Diagram needed?}
  B -->|Yes| C[Type /diagram]
  B -->|No| D[Keep writing]
  C --> D`,
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
      {/* Replaces the default Formatting Toolbar, adding the Diagram block to
          the block type select so blocks can be converted to it. */}
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar
            blockTypeSelectItems={[
              ...blockTypeSelectItems(editor.dictionary),
              ...getDiagramBlockTypeSelectItems(editor),
            ]}
          />
        )}
      />
      {/* Replaces the default Slash Menu. */}
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) => {
          // Gets the default slash menu items and adds the Diagram item at
          // the end of its group ("Advanced").
          const items = combineByGroup(
            getDefaultReactSlashMenuItems(editor),
            getDiagramSlashMenuItems(editor),
          );

          // Returns filtered items based on the query.
          return filterSuggestionItems(items, query);
        }}
      />
    </BlockNoteView>
  );
}
