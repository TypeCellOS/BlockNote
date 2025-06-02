import {
  BlockNoteSchema,
  defaultInlineContentSpecs,
  filterSuggestionItems,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  DefaultReactSuggestionItem,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { ReferenceInlineBlock } from "./ReferenceInlineBlock";

export default function App() {
  const schema = BlockNoteSchema.create({
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
      reference: ReferenceInlineBlock,
    },
  });

  const getReferenceMenuItems = (
    editor: typeof schema.BlockNoteEditor,
  ): DefaultReactSuggestionItem[] => {
    const citations = [
      {
        doi: "10.1093/ajae/aaq063",
      },
      {
        doi: "10.1234/example.doi",
      },
      {
        doi: "10.5678/another.example",
      },
    ];

    return citations.map((citation) => ({
      title: `Add reference: ${citation.doi}`,
      onItemClick: () => {
        editor.insertInlineContent([
          {
            type: "reference",
            props: {
              ...citation,
            },
          },
          " ",
        ]);
      },
    }));
  };

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
    <BlockNoteView editor={editor}>
      <SuggestionMenuController
        triggerCharacter={"@"}
        getItems={async (query) =>
          filterSuggestionItems(getReferenceMenuItems(editor), query)
        }
      />
    </BlockNoteView>
  );
}
