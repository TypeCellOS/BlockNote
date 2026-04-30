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

// Schema with the default blocks plus our custom Callout container block.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: createCallout(),
  },
});

// Slash menu item to insert a Callout. Because Callout is a container block,
// inserting one with no children causes BlockNote to seed it with the block's
// configured `defaultBlocks` (a single paragraph here).
const insertCallout = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Callout",
  subtext: "Container block that wraps other blocks",
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
        content: "Welcome — this demo shows the new `container` block kind.",
      },
      {
        type: "callout",
        props: { flavor: "tip" },
        children: [
          {
            type: "paragraph",
            content: "Callouts can hold any block as their body.",
          },
          {
            type: "paragraph",
            content: "Try pressing '/' inside this callout to add a heading or code block.",
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
