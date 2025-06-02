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
        key: 1,
        doi: "10.1093/ajae/aaq063",
        author: "Steve Smith",
        title: "Understanding BlockNote",
        journal: "BlockNote Journal",
        year: 2023,
      },
      {
        key: 2,
        doi: "10.1234/example.doi",
        author: "Jane Doe",
        title: "Exploring BlockNote Features",
        journal: "BlockNote Features Journal",
        year: 2022,
      },
      {
        key: 3,
        doi: "10.5678/another.example",
        author: "John Doe",
        title: "Advanced BlockNote Techniques",
        journal: "BlockNote Techniques Journal",
        year: 2021,
      },
    ];

    return citations.map((citation) => ({
      title: citation.title,
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
              key: 1,
              doi: "10.1093/ajae/aaq063",
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
