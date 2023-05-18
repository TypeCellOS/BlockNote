import { DefaultBlockSchema, defaultBlockSchema } from "@blocknote/core";
import {
  BlockNoteView,
  defaultReactSlashMenuItems,
  ReactSlashMenuItem,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/core/style.css";
import styles from "./Editor.module.css";
import { Alert, insertAlert } from "../customblocks/Alert";
import { Button, insertButton } from "../customblocks/Button";
import { Embed, insertEmbed } from "../customblocks/Embed";
import { Image, insertImage } from "../customblocks/Image";
import { Separator, insertSeparator } from "../customblocks/Separator";
import {
  TableOfContents,
  insertTableOfContents,
} from "../customblocks/TableOfContents";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

const customBlocks = {
  alert: {
    block: Alert,
    slashCommand: insertAlert,
  },
  button: {
    block: Button,
    slashCommand: insertButton,
  },
  embed: {
    block: Embed,
    slashCommand: insertEmbed,
  },
  image: {
    block: Image,
    slashCommand: insertImage,
  },
  separator: {
    block: Separator,
    slashCommand: insertSeparator,
  },
  toc: {
    block: TableOfContents,
    slashCommand: insertTableOfContents,
  },
} as const;

export type CustomBlocks = typeof customBlocks;

export default function Editor(props: { blockTypes: (keyof CustomBlocks)[] }) {
  const blockSchema: Partial<{
    [BlockType in keyof CustomBlocks]: CustomBlocks[BlockType]["block"];
  }> = Object.fromEntries(
    props.blockTypes.map((blockType) => [
      blockType,
      customBlocks[blockType].block,
    ])
  );

  type CustomBlockSchema = typeof blockSchema & DefaultBlockSchema;

  const slashCommands = props.blockTypes.map(
    (blockType) => customBlocks[blockType].slashCommand
  ) as ReactSlashMenuItem<CustomBlockSchema>[];

  const editor = useBlockNote<CustomBlockSchema>({
    editorDOMAttributes: {
      class: styles.editor,
      "data-test": "editor",
    },
    blockSchema: {
      ...defaultBlockSchema,
      ...blockSchema,
    },
    slashCommands: [
      ...defaultReactSlashMenuItems<CustomBlockSchema>(),
      ...slashCommands,
    ],
  });

  console.log(editor);

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView editor={editor} />;
}
