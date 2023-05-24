import { defaultBlockSchema } from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  ReactSlashMenuItem,
  defaultReactSlashMenuItems,
  useBlockNote,
} from "@blocknote/react";
import { Alert, insertAlert } from "../customblocks/Alert";
import { Button, insertButton } from "../customblocks/Button";
import { Embed, insertEmbed } from "../customblocks/Embed";
import { Image, insertImage } from "../customblocks/Image";
import { Separator, insertSeparator } from "../customblocks/Separator";
import {
  TableOfContents,
  insertTableOfContents,
} from "../customblocks/TableOfContents";
import styles from "./Editor.module.css";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

export default function Editor() {
  const blockSchema = {
    ...defaultBlockSchema,
    alert: Alert,
    button: Button,
    embed: Embed,
    image: Image,
    separator: Separator,
    toc: TableOfContents,
  } as const;

  const slashCommands = [
    insertAlert,
    insertButton,
    insertEmbed,
    insertImage,
    insertSeparator,
    insertTableOfContents,
  ] as ReactSlashMenuItem<typeof blockSchema>[];

  const editor = useBlockNote<typeof blockSchema>({
    editorDOMAttributes: {
      class: styles.editor,
      "data-test": "editor",
    },
    blockSchema: blockSchema,
    slashCommands: [
      ...(defaultReactSlashMenuItems as ReactSlashMenuItem<
        typeof blockSchema
      >[]),
      ...slashCommands,
    ],
  });

  console.log(editor);

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView editor={editor} />;
}
