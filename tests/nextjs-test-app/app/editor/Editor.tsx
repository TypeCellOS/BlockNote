"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { schema } from "../shared-schema";

export default function Editor() {
  const editor = useCreateBlockNote({ schema });

  return (
    <div data-testid="editor-wrapper">
      <BlockNoteView editor={editor} />
    </div>
  );
}
