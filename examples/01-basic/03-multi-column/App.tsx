import {
  BlockNoteSchema,
  combineByGroup,
  filterSuggestionItems,
  locales,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  getMultiColumnSlashMenuItems,
  multiColumnDropCursor,
  locales as multiColumnLocales,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import { useMemo } from "react";
export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    // Adds column and column list blocks to the schema.
    schema: withMultiColumn(BlockNoteSchema.create()),
    // The default drop cursor only shows up above and below blocks - we replace
    // it with the multi-column one that also shows up on the sides of blocks.
    dropCursor: multiColumnDropCursor,
    // Merges the default dictionary with the multi-column dictionary.
    dictionary: {
      ...locales.en,
      multi_column: multiColumnLocales.en,
    },
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "columnList",
        children: [
          {
            type: "column",
            props: {
              width: 0.8,
            },
            children: [
              {
                type: "paragraph",
                content: "This paragraph is in a column!",
              },
            ],
          },
          {
            type: "column",
            props: {
              width: 1.4,
            },
            children: [
              {
                type: "heading",
                content: "So is this heading!",
              },
            ],
          },
          {
            type: "column",
            props: {
              width: 0.8,
            },
            children: [
              {
                type: "paragraph",
                content: "You can have multiple blocks in a column too",
              },
              {
                type: "bulletListItem",
                content: "Block 1",
              },
              {
                type: "bulletListItem",
                content: "Block 2",
              },
              {
                type: "bulletListItem",
                content: "Block 3",
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Gets the default slash menu items merged with the multi-column ones.
  const getSlashMenuItems = useMemo(() => {
    return async (query: string) =>
      filterSuggestionItems(
        combineByGroup(
          getDefaultReactSlashMenuItems(editor),
          getMultiColumnSlashMenuItems(editor)
        ),
        query
      );
  }, [editor]);

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      {/* Replaces the default slash menu with one that has both the default
      items and the multi-column ones. */}
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={getSlashMenuItems}
      />
    </BlockNoteView>
  );
}
