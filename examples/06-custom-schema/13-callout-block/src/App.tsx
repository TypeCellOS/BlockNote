import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
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
import { useEffect, useState } from "react";
import { RiChatQuoteLine } from "react-icons/ri";

import { createCallout } from "./Callout";
import "./styles.css";

// Schema with the default blocks plus our custom Callout titled block.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: createCallout(),
  },
});

// Slash menu item to insert a Callout.
const insertCallout = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Callout",
  subtext: "Titled container block that wraps other blocks",
  onItemClick: () =>
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "callout",
    }),
  aliases: ["callout", "container", "alert", "note", "tip", "info"],
  group: "Basic blocks",
  icon: <RiChatQuoteLine />,
});

type AppBlock = (typeof schema.BlockNoteEditor)["document"][number];

export default function App() {
  const [blocks, setBlocks] = useState<AppBlock[]>([]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content:
          "Welcome! This demo shows a titled block: a rich-text title with a body of child blocks.",
      },
      {
        type: "callout",
        content: "A callout with a real title",
        children: [
          {
            type: "paragraph",
            content:
              "The title is ordinary inline content: formatting, links, and multiplayer cursors all work.",
          },
          {
            type: "paragraph",
            content:
              "Press Enter at the end of the title to jump into the body, or Backspace at the start of the body to merge back.",
          },
        ],
      },
      {
        type: "paragraph",
        content: "Press '/' anywhere to insert a new Callout.",
      },
      {
        type: "paragraph",
      },
    ],
  });

  useEffect(() => setBlocks(editor.document), [editor]);

  return (
    <div className={"wrapper"}>
      <div>BlockNote Editor:</div>
      <div className={"item"}>
        <BlockNoteView
          editor={editor}
          slashMenu={false}
          onChange={() => {
            setBlocks(editor.document);
          }}
        >
          <SuggestionMenuController
            triggerCharacter={"/"}
            getItems={async (query) => {
              const defaultItems = getDefaultReactSlashMenuItems(editor);
              const lastBasicBlockIndex = defaultItems.findLastIndex(
                (item) => item.group === "Basic blocks",
              );
              defaultItems.splice(
                lastBasicBlockIndex + 1,
                0,
                insertCallout(editor),
              );
              return filterSuggestionItems(defaultItems, query);
            }}
          />
        </BlockNoteView>
      </div>
      <div>Document JSON:</div>
      <div className={"item bordered"}>
        <pre>
          <code>{JSON.stringify(blocks, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}
