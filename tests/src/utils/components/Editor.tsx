import { filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteDefaultUI,
  BlockNoteView,
  DefaultPositionedSuggestionMenu,
  getDefaultReactSlashMenuItems,
  useBlockNote,
} from "@blocknote/react";
import { Alert, insertAlert } from "../customblocks/Alert";
import { Button } from "../customblocks/Button";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

const blockSpecs = {
  // ...defaultBlockSpecs,
  alert: Alert,
  button: Button,
  // embed: Embed,
  // image: Image,
  // separator: Separator,
  // toc: TableOfContents,
};

const defaultItems = getDefaultReactSlashMenuItems();

const customItems = [
  insertAlert,
  // insertButton,
  // insertEmbed,
  // insertImage,
  // insertSeparator,
  // insertTableOfContents,
];

const allItems = [...defaultItems, ...customItems];

export default function Editor() {
  const editor = useBlockNote({
    blockSpecs,
  });

  console.log(editor);

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;
  // editor.insertBlocks([{
  //   type:""
  // }])
  // TODO: how to customize slashmenu
  return (
    <BlockNoteView editor={editor}>
      <BlockNoteDefaultUI editor={editor} slashMenu={false} />
      <DefaultPositionedSuggestionMenu
        editor={editor}
        getItems={async (query) => filterSuggestionItems(allItems, query)}
        onItemClick={(i) => i.onItemClick(editor)}
        // suggestionMenuComponent={MantineSuggestionMenu}
        triggerCharacter="/"
      />
    </BlockNoteView>
  );
}
