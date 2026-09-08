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
import { RiAlarmWarningLine } from "react-icons/ri";

import { createAlert, createAlertBox } from "./Alert";
import "./styles.css";

// Schema with the default blocks plus the two alert variants: `alert` keeps
// its title as inline content with child blocks as its body, while
// `alertBox` is a pure container holding only child blocks.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    alert: createAlert(),
    alertBox: createAlertBox(),
  },
});

// Slash menu items to insert each alert variant. Inserting one with no
// children fills it with an empty paragraph, as `min` defaults to 1.
const insertAlert = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Alert",
  subtext: "Alert with a title and a body of blocks",
  onItemClick: () =>
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "alert",
      content: "Heads up",
    }),
  aliases: ["alert", "callout", "note", "warning"],
  group: "Basic blocks",
  icon: <RiAlarmWarningLine />,
});

const insertAlertBox = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Alert box",
  subtext: "Alert body with no title",
  onItemClick: () =>
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "alertBox",
    }),
  aliases: ["alertbox", "alert box", "callout", "note"],
  group: "Basic blocks",
  icon: <RiAlarmWarningLine />,
});

type AppBlock = (typeof schema.BlockNoteEditor)["document"][number];

export default function App() {
  const [blocks, setBlocks] = useState<AppBlock[]>([]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome! This demo shows two alert variants.",
      },
      {
        type: "alert",
        props: { flavor: "warning" },
        content: "Heads up",
        children: [
          {
            type: "paragraph",
            content:
              "This alert keeps its title as inline content, with child blocks as its body.",
          },
          {
            type: "paragraph",
            content:
              "Press Enter at the end of the title to start the body, or Backspace at the start of the first body block to merge back into it.",
          },
        ],
      },
      {
        type: "alertBox",
        props: { flavor: "info" },
        children: [
          {
            type: "paragraph",
            content:
              "This alert has no title: it is a pure container holding only child blocks.",
          },
        ],
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
                insertAlert(editor),
                insertAlertBox(editor),
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
