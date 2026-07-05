import { createHighlighter } from "@blocknote/code-block";
import { BlockNoteSchema } from "@blocknote/core";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { createReactDiagramBlockSpec } from "@blocknote/diagram-block";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { TbSitemap } from "react-icons/tb";

// Our schema with block specs, which contain the configs and implementations
// for blocks that we want our editor to use.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    // Creates an instance of the Diagram block and adds it to the schema.
    // TODO: naing
    diagram: createReactDiagramBlockSpec(),
  },
});

// Slash menu item to insert a Diagram block.
// TODO: extract?
const insertDiagram = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Diagram",
  subtext: "Insert a diagram rendered from Mermaid source",
  onItemClick: () =>
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "diagram",
      content: "graph TD\n    A[Start] --> B[Stop]",
    }),
  aliases: ["mermaid", "diagram", "flowchart", "chart", "graph"],
  group: "Advanced",
  icon: <TbSitemap />,
});

export default function App() {
  const editor = useCreateBlockNote({
    // Configures the syntax highlighting extension to use Mermaid syntax
    // highlighting in the Diagram block's source popup.
    syntaxHighlighting: {
      createHighlighter,
      highlightBlock: (block) =>
        block.type === "diagram" ? "mermaid" : block.props.language,
    },
    schema,
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
          // Inserts the Diagram item at the end of the "Advanced" group.
          defaultItems.splice(lastAdvancedIndex + 1, 0, insertDiagram(editor));

          // Returns filtered items based on the query.
          return filterSuggestionItems(defaultItems, query);
        }}
      />
    </BlockNoteView>
  );
}
