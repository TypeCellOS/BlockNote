"use client";

import { useYDoc, useYjsProvider, YDocProvider } from "@y-sweet/react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { withCollaboration } from "@blocknote/core/yjs";

import "@blocknote/mantine/style.css";

export default function App() {
  const docId = "my-blocknote-document";

  return (
    <YDocProvider
      docId={docId}
      authEndpoint="https://demos.y-sweet.dev/api/auth"
    >
      <Document />
    </YDocProvider>
  );
}

function Document() {
  const provider = useYjsProvider();
  const doc = useYDoc();

  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        provider,
        fragment: doc.getXmlFragment("blocknote"),
        user: { color: "#ff0000", name: "My Username" },
      },
    }),
  );

  return <BlockNoteView editor={editor} />;
}
