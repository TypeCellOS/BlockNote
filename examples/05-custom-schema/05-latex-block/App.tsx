import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  filterSuggestionItems,
  insertOrUpdateBlock,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import { LaTex } from "./LaTex";

// Our schema with block specs, which contain the configs and implementations for blocks
// that we want our editor to use.
const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    latex: LaTex,
  },
});

// Slash menu item to insert an Alert block
const insertLaTex = (editor: typeof schema.BlockNoteEditor) => ({
  title: "latex",
  key: "latex",
  subtext: "Used for a top-level heading",
  aliases: ["latex", "heading1", "h1"],
  group: "Other",
  onItemClick: () => {
    insertOrUpdateBlock(editor, {
      type: "paragraph",
      content: [
        {
          type: "latex",
          props: {
            latex: "",
            open: true,
          },
          content: 'c = \\pm\\sqrt{a^2 + b^2}'
        },
      ],
    });
  },
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: [
          "I enjoy working with ",
          {
            type: "latex",
            content: "c = \\pm\\sqrt{a^2 + b^2}",
          },
        ],
      },
      {
        type: "paragraph",
        content: "Press the '/' key to open the Slash Menu and add another",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) =>
          filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor), insertLaTex(editor)],
            query
          )
        }
      />
    </BlockNoteView>
  );
}
