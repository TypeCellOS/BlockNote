/* eslint-disable import/no-extraneous-dependencies */
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import Uppy from "@uppy/core";
import XHR from "@uppy/xhr-upload";

import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

const uploadFileUppy = new Uppy().use(XHR, {
  endpoint: "https://tmpfiles.org/api/v1/upload",
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content: "Upload an image using the button below",
      },
      {
        type: "image",
      },
      {
        type: "video",
      },
      {
        type: "paragraph",
      },
    ],
    uploadFileUppy,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
