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
import { RiListOrdered2 } from "react-icons/ri";

import { createStep, createStepper } from "./Stepper";
import "./styles.css";

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    stepper: createStepper(),
    step: createStep(),
  },
});

function insertStepper(editor: typeof schema.BlockNoteEditor) {
  return {
    title: "Stepper",
    subtext: "Numbered steps, each holding any blocks",
    onItemClick: () =>
      insertOrUpdateBlockForSlashMenu(editor, {
        type: "stepper",
        children: [
          {
            type: "step",
            children: [
              { type: "heading", props: { level: 3 }, content: "First step" },
            ],
          },
          {
            type: "step",
            children: [
              { type: "heading", props: { level: 3 }, content: "Second step" },
            ],
          },
        ],
      } as any),
    aliases: ["stepper", "steps", "guide", "walkthrough"],
    group: "Basic blocks",
    icon: <RiListOrdered2 />,
  };
}

export default function App() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "A stepper built on the container API. Numbering is CSS.",
      },
      {
        type: "stepper",
        children: [
          {
            type: "step",
            children: [
              { type: "heading", props: { level: 3 }, content: "Install" },
              { type: "paragraph", content: "Download and run the installer." },
            ],
          },
          {
            type: "step",
            children: [
              { type: "heading", props: { level: 3 }, content: "Configure" },
              { type: "paragraph", content: "Any block works inside a step:" },
              { type: "bulletListItem", content: "lists" },
              { type: "codeBlock", content: "code()" },
            ],
          },
          {
            type: "step",
            children: [
              { type: "heading", props: { level: 3 }, content: "Ship" },
              { type: "paragraph", content: "Deploy it." },
            ],
          },
        ],
      } as any,
      { type: "paragraph", content: "Press '/' to insert another stepper." },
      { type: "paragraph" },
    ],
  });

  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) =>
          filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor), insertStepper(editor)],
            query,
          )
        }
      />
    </BlockNoteView>
  );
}
