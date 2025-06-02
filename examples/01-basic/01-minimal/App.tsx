import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  filterSuggestionItems,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";

import {
  BibliographyBlockContent,
  getInsertBibliographyBlockSlashMenuItem,
} from "./Bibliography.js";
import { getInsertReferenceSlashMenuItem, Reference } from "./Reference.js";

import "./styles.css";

export default function App() {
  const schema = BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      bibliography: BibliographyBlockContent,
    },
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
      reference: Reference,
    },
  });

  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Woah, you can add a reference like this: ",
            styles: {},
          },
          {
            type: "reference",
            props: {
              key: 1,
              // doi: "10.1093/ajae/aaq063",
              doi: "",
              author: "Steve Smith",
              title: "Understanding BlockNote",
              journal: "BlockNote Journal",
              year: 2023,
            },
          },
          {
            type: "text",
            text: " <- This is an example reference",
            styles: {},
          },
        ],
      },
      {
        type: "paragraph",
        content:
          "Press the '@' key to open the references menu and add another",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...getDefaultReactSlashMenuItems(editor),
              getInsertReferenceSlashMenuItem(editor),
              getInsertBibliographyBlockSlashMenuItem(editor),
            ],
            query,
          )
        }
      />
    </BlockNoteView>
  );
}
