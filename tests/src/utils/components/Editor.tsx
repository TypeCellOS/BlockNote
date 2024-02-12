import { defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  getDefaultReactSlashMenuItems,
  useBlockNote,
} from "@blocknote/react";
import { Alert, insertAlert } from "../customblocks/Alert";
import { Button, insertButton } from "../customblocks/Button";
import { Embed, insertEmbed } from "../customblocks/Embed";
import { Image, insertImage } from "../customblocks/Image";
import { Separator, insertSeparator } from "../customblocks/Separator";

export default function Editor() {
  const blockSpecs = {
    ...defaultBlockSpecs,
    alert: Alert,
    button: Button,
    embed: Embed,
    image: Image,
    separator: Separator,
    // toc: TableOfContents,
  };

  const slashMenuItems = [
    insertAlert,
    insertButton,
    insertEmbed,
    insertImage,
    insertSeparator,
    // insertTableOfContents,
  ];

  const editor = useBlockNote({
    blockSpecs,
    slashMenuItems: [...getDefaultReactSlashMenuItems(), ...slashMenuItems],
  });

  console.log(editor);

  // Give tests a way to get prosemirror instance
  (window as any).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView editor={editor} />;
}
