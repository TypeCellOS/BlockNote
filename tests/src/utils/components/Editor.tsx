import { BlockSchemaFromSpecs, filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteDefaultUI,
  BlockNoteView,
  DefaultReactSuggestionItem,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
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

const customItems = [
  insertAlert,
  // insertButton,
  // insertEmbed,
  // insertImage,
  // insertSeparator,
  // insertTableOfContents,
];

export default function Editor() {
  const editor = useCreateBlockNote({ blockSpecs });

  console.log(editor);

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;
  // editor.insertBlocks([{
  //   type:""
  // }])
  // TODO: how to customize slashmenu
  return (
    <BlockNoteView editor={editor}>
      <BlockNoteDefaultUI slashMenu={false} />
      <SuggestionMenuController
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...getDefaultReactSlashMenuItems(editor),
              ...customItems,
            ] satisfies DefaultReactSuggestionItem<
              BlockSchemaFromSpecs<typeof blockSpecs>
            >[],
            query
          )
        }
        // suggestionMenuComponent={MantineSuggestionMenu}
        triggerCharacter="/"
      />
    </BlockNoteView>
  );
}
