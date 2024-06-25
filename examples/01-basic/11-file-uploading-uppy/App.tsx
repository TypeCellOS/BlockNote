/* eslint-disable import/no-extraneous-dependencies */
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import Uppy from "@uppy/core";
import XHR from "@uppy/xhr-upload";

async function uploadFile(file: File) {
  const uppy = new Uppy().use(XHR, {
    endpoint: "https://tmpfiles.org/api/v1/upload",
  });

  uppy.addFile({
    name: file.name,
    type: file.type,
    data: file,
  });

  const result = await uppy.upload();
  let url = result.successful[0].response.body.data.url;
  url = url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
  return url;
}

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
    ],
    uploadFile,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
