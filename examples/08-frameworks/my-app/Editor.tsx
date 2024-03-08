"use client"; // this registers <Editor> as a Client Component
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { uploadFileServerAction } from "./app/actions";

// Our <Editor> component we can reuse later
export default function Editor() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    uploadFile: (file: File) => {
      const form = new FormData();
      form.append("fileUpload", file);
      return uploadFileServerAction(form);
    },
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
