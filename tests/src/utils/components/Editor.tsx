import {
  BlockNoteEditor,
  BlockSchema,
  defaultBlockSpecs,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteDefaultUI,
  BlockNoteView,
  defaultGetItems,
  DefaultPositionedSuggestionMenu,
  useBlockNote,
} from "@blocknote/react";
import { Alert, insertAlert } from "../customblocks/Alert";
import { Button, insertButton } from "../customblocks/Button";
import { Embed, insertEmbed } from "../customblocks/Embed";
import { Image, insertImage } from "../customblocks/Image";
import { Separator, insertSeparator } from "../customblocks/Separator";
import styles from "./Editor.module.css";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

const blockSpecs = {
  ...defaultBlockSpecs,
  alert: Alert,
  button: Button,
  embed: Embed,
  image: Image,
  separator: Separator,
  // toc: TableOfContents,
};

const getSlashMenuItems = async <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  query: string,
  closeMenu: () => void,
  clearQuery: () => void
) => {
  const defaultItems = await defaultGetItems(
    editor,
    query,
    closeMenu,
    clearQuery
  );

  const customItems = [
    insertAlert,
    insertButton,
    insertEmbed,
    insertImage,
    insertSeparator,
    // insertTableOfContents,
  ]
    .map((getItem) => getItem(editor, closeMenu, clearQuery))
    .filter(
      ({ name, aliases }) =>
        name.toLowerCase().startsWith(query.toLowerCase()) ||
        (aliases &&
          aliases.filter((alias) =>
            alias.toLowerCase().startsWith(query.toLowerCase())
          ).length !== 0)
    );

  return [...defaultItems, ...customItems];
};

export default function Editor() {
  const editor = useBlockNote({
    domAttributes: {
      editor: { class: styles.editor, "data-test": "editor" },
    },
    blockSpecs,
  });

  console.log(editor);

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return (
    <BlockNoteView editor={editor}>
      <BlockNoteDefaultUI editor={editor} slashMenu={false} />
      <DefaultPositionedSuggestionMenu
        editor={editor}
        getItems={(query, closeMenu, clearQuery) =>
          getSlashMenuItems(editor, query, closeMenu, clearQuery)
        }
      />
    </BlockNoteView>
  );
}
