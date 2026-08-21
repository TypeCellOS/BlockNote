import { uploadFile_DEV_ONLY } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

// "Uploads" a file using BlockNote's dev-only helper, which encodes it as a
// base64 data URL. We add a short delay first to simulate the latency of a real
// server upload. In a real app you'd replace this with an upload to your own
// backend that returns a URL to the stored file.
async function uploadFile(file: File) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return uploadFile_DEV_ONLY(file);
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
