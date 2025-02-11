"use client";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

import "@blocknote/mantine/style.css";

export default function App() {
  const editor = useCreateBlockNote({});

  return <BlockNoteView editor={editor} />;
}
