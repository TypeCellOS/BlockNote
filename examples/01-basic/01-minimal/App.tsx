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
  getBibliographyReactSlashMenuItems,
  getDefaultReactSlashMenuItems,
  ReactBibliographyBlockContent,
  ReactReferenceInlineContent,
  SuggestionMenuController,
  useCreateBlockNote,
  useSingleBibliographyBlock,
} from "@blocknote/react";

import "./styles.css";

export default function App() {
  const schema = BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      bibliography: ReactBibliographyBlockContent,
    },
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
      reference: ReactReferenceInlineContent,
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
              doi: "10.1093/ajae/aaq063",
              // doi: "",
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
        type: "bibliography",
        props: {
          bibTexJSON: JSON.stringify([
            "10.1093/ajae/aaq063", // Example DOI
            "https://doi.org/10.48550/arXiv.2505.23896", // Another example DOI
            "https://doi.org/10.48550/arXiv.2505.23900",
            "https://doi.org/10.48550/arXiv.2505.23904",
            "https://doi.org/10.48550/arXiv.2505.24234",
          ]),
        },
      },
      {
        type: "paragraph",
      },
    ],
  });

  useSingleBibliographyBlock(editor);

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...getDefaultReactSlashMenuItems(editor),
              ...getBibliographyReactSlashMenuItems(editor),
            ],
            query,
          )
        }
      />
    </BlockNoteView>
  );
}
