import { BlockNoteSchema } from "@blocknote/core";
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
import { RiLayoutTopLine } from "react-icons/ri";

import { createTab, createTabs } from "./Tabs";
import "./styles.css";

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    tabs: createTabs(),
    tab: createTab(),
  },
});

// A tab set is only useful with its panels, so the slash menu inserts both.
function insertTabs(editor: typeof schema.BlockNoteEditor) {
  return {
    title: "Tabs",
    subtext: "A tab strip with one panel per tab",
    onItemClick: () =>
      insertOrUpdateBlockForSlashMenu(editor, {
        type: "tabs",
        children: [
          {
            type: "tab",
            props: { label: "First" },
            children: [{ type: "paragraph", content: "First panel" }],
          },
          {
            type: "tab",
            props: { label: "Second" },
            children: [{ type: "paragraph", content: "Second panel" }],
          },
        ],
      } as any),
    aliases: ["tabs", "tab"],
    group: "Basic blocks",
    icon: <RiLayoutTopLine />,
  };
}

export default function App() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "Tabs built on the container API. Each panel holds any block.",
      },
      {
        // A persistent ID so the open tab is remembered across reloads: the
        // choice is stored per tab-set id, and a fresh document would
        // otherwise get a fresh one.
        id: "tabs-demo",
        type: "tabs",
        children: [
          {
            // Persistent IDs alongside the set's, so the remembered choice
            // still names a panel after a reload.
            id: "tab-install",
            type: "tab",
            props: { label: "Install" },
            children: [
              { type: "heading", props: { level: 3 }, content: "Install" },
              { type: "paragraph", content: "Run the installer, then reboot." },
              { type: "bulletListItem", content: "Any block works in here" },
            ],
          },
          {
            id: "tab-configure",
            type: "tab",
            props: { label: "Configure" },
            children: [
              { type: "heading", props: { level: 3 }, content: "Configure" },
              { type: "paragraph", content: "Edit the config file." },
            ],
          },
        ],
      } as any,
      { type: "paragraph", content: "Press '/' to insert another tab set." },
      { type: "paragraph" },
    ],
  });

  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) =>
          filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor), insertTabs(editor)],
            query,
          )
        }
      />
    </BlockNoteView>
  );
}
