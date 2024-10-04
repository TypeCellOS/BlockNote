import { BlockNoteSchema } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";
import "@blocknote/ariakit/style.css";
import * as Y from "yjs";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toUint8Array } from "js-base64";

const schema = BlockNoteSchema.create();

export default function App() {
  // Just fetches the initial contents
  const { data: initialContentsUpdateVector, refetch } = useQuery({
    queryKey: [1],
    queryFn: async () =>
      fetch("http://localhost:8080/")
        .then((res) => res.text())
        .then((res) => toUint8Array(res)), // API returns initial doc as a yjs update encoded as base64
  });

  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    if (initialContentsUpdateVector) {
      // https://docs.yjs.dev/api/document-updates
      Y.applyUpdateV2(doc, initialContentsUpdateVector);
    }

    return doc;
  }, [initialContentsUpdateVector]);

  // Cleanup of the ydoc it is re-initialized
  useEffect(() => {
    return () => {
      if (ydoc) {
        ydoc.destroy();
      }
    };
  }, [ydoc]);

  // Creates a new editor instance.
  const editor = useCreateBlockNote(
    {
      collaboration: {
        fragment: ydoc.getXmlFragment("document-store"),
        provider: null,
        user: {
          name: "me",
          color: "white",
        },
      },
      schema,
    },
    [ydoc] // Since we are changing the doc we need to re-initialize the editor
  );

  return (
    <>
      <button onClick={() => refetch()}>refetch initial contents</button>
      <BlockNoteView editor={editor}></BlockNoteView>
    </>
  );
}
