import { BlockNoteSchema } from "@blocknote/core";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { RiChatQuoteLine } from "react-icons/ri";

import { createPanel } from "./Panel";
import "./styles.css";

// Schema with the default blocks plus our custom Panel layout block.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    panel: createPanel(),
  },
});

// Slash menu item to insert a Panel. Inserting one with no children fills
// it with an empty paragraph: a layout block always holds at least one child.
function insertPanel(editor: typeof schema.BlockNoteEditor) {
  return {
    title: "Panel",
    subtext: "Layout block that wraps other blocks",
    onItemClick: () =>
      insertOrUpdateBlockForSlashMenu(editor, {
        type: "panel",
      }),
    aliases: ["panel", "layout", "container", "box", "group", "section"],
    group: "Basic blocks",
    icon: <RiChatQuoteLine />,
  };
}

export default function App() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome! This demo shows the new layout block kind.",
      },
      {
        type: "panel",
        children: [
          {
            type: "heading",
            props: { level: 3 },
            content: "More than paragraphs",
          },
          {
            type: "paragraph",
            content: "Panels can hold any block as their body.",
          },
          {
            type: "paragraph",
            content:
              "Try pressing '/' inside this panel to add a heading or code block.",
          },
        ],
      },
      {
        type: "paragraph",
        content: "Press '/' anywhere to insert a new Panel.",
      },
      {
        type: "paragraph",
      },
    ],
  });

  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) =>
          filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor), insertPanel(editor)],
            query,
          )
        }
      />
    </BlockNoteView>
  );
}
