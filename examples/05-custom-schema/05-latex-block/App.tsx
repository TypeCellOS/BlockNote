import {
  BlockNoteSchema,
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
            open: true
          },
          content: '\\sqrt{a^2 + b^2}'
        }
      ]
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
          "latex text editor ",
          {
            type: "latex",
            content: "c = \\pm\\sqrt{a^2 + b^2}",
          },
        ],
      },
      {
        type: "paragraph",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "latex",
            content: "\\int \\frac{1}{\\sqrt{1-x^{2}}}\\mathrm{d}x= \\arcsin x +C"
          },
        ],
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
