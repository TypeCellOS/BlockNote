import {
  BlockNoteSchema,
  defaultInlineContentSpecs,
  filterSuggestionItems,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { RiFormula } from "react-icons/ri";
import "@blocknote/mantine/style.css";

import { InlineEquation } from "./Equation";

// Our schema with block specs, which contain the configs and implementations for blocks
// that we want our editor to use.
const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    inlineEquation: InlineEquation,
  },
});

// Slash menu item to insert an Alert block
const insertLaTex = (editor: typeof schema.BlockNoteEditor) => ({
  icon: <RiFormula size={18}/>,
  title: "Inline Equation",
  key: "inlineEquation",
  subtext: "Insert mathematical symbols in text.",
  aliases: ["equation", "latex", "katex"],
  group: "Other",
  onItemClick: () => {
    const view = editor._tiptapEditor.view;
    const pos = editor._tiptapEditor.state.selection.from;
    const tr = view.state.tr.insert(
        pos,
        view.state.schema.nodes.inlineEquation.create(),
    );
    view.dispatch(tr);
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
          "This is an example inline equation ",
          {
            type: "inlineEquation",
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
      {
        type: "paragraph",
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
        getItems={async (query: any) =>
          filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor), insertLaTex(editor)],
            query
          )
        }
      />
    </BlockNoteView>
  );
}
