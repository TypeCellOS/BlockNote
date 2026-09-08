import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import {
  SideMenuExtension,
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  SideMenu,
  SideMenuController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useBlockNoteEditor,
  useCreateBlockNote,
  useEditorState,
  useExtensionState,
} from "@blocknote/react";
import { useEffect, useState } from "react";
import { RiChatQuoteLine } from "react-icons/ri";

import { createPanel } from "./Panel";
import "./styles.css";

// Schema with the default blocks plus our custom Panel container block.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    panel: createPanel(),
  },
});

// Slash menu item to insert a Panel. Inserting one with no children fills
// it with an empty paragraph, as `min` defaults to 1.
const insertPanel = (editor: typeof schema.BlockNoteEditor) => ({
  title: "Panel",
  subtext: "Container block that wraps other blocks",
  onItemClick: () =>
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "panel",
    }),
  aliases: ["panel", "container", "callout", "alert", "note", "tip", "info"],
  group: "Basic blocks",
  icon: <RiChatQuoteLine />,
});

type AppBlock = (typeof schema.BlockNoteEditor)["document"][number];

function PanelSideMenu() {
  const editor = useBlockNoteEditor<
    typeof schema.blockSchema,
    typeof schema.inlineContentSchema,
    typeof schema.styleSchema
  >();
  const blockId = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block.id,
  });
  const isFirstPanelChild = useEditorState({
    editor,
    selector: () => {
      if (!blockId || !editor.getBlock(blockId)) {
        return false;
      }
      const parent = editor.getParentBlock(blockId);
      return parent?.type === "panel" && parent.children[0]?.id === blockId;
    },
  });

  // The first child's gutter is occupied by the panel's flavor button.
  return isFirstPanelChild ? null : <SideMenu />;
}

export default function App() {
  const [blocks, setBlocks] = useState<AppBlock[]>([]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome! This demo shows the new container block kind.",
      },
      {
        type: "panel",
        props: { flavor: "tip" },
        children: [
          {
            type: "heading",
            props: { level: 3 },
            content: "More than paragraphs",
          },
          {
            type: "paragraph",
            content: "Panels can hold any block as their body.",
          },
          {
            type: "paragraph",
            content:
              "Try pressing '/' inside this panel to add a heading or code block.",
          },
        ],
      },
      {
        type: "paragraph",
        content: "Press '/' anywhere to insert a new Panel.",
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
          sideMenu={false}
          onChange={() => {
            setBlocks(editor.document);
          }}
        >
          <SideMenuController sideMenu={PanelSideMenu} />
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
                insertPanel(editor),
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
