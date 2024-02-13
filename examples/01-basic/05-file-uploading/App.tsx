import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

/**
 * Uploads a file to tmpfiles.org and returns the URL to the uploaded file.
 *
 * @warning This function should only be used for development purposes, replace with your own backend!
 */
async function uploadFile(file: File) {
  const body = new FormData();
  body.append("file", file);

  const ret = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: body,
  });
  return (await ret.json()).data.url.replace(
    "tmpfiles.org/",
    "tmpfiles.org/dl/"
  );
}

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote({
    uploadFile,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
