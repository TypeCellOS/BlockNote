/* eslint-disable import/no-extraneous-dependencies */
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote, FilePanelController } from "@blocknote/react";

import Uppy from "@uppy/core";
import XHR from "@uppy/xhr-upload";
import { Dashboard } from "@uppy/react";

import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

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
  });

  const uppy = new Uppy().use(XHR, {
    endpoint: "https://tmpfiles.org/api/v1/upload",
  });

  uppy.on("upload-success", (file: any, response: any) => {
    // File should be removed from the uppy instance after successful upload.
    if (response.status === 200) {
      uppy.removeFile(file.id);
    }

    const block = editor.document[2];

    // The file URL is returned in the response body need to be modified to be downloadable.
    let fileURL = response.body.data.url;
    fileURL = fileURL.replace("tmpfiles.org/", "tmpfiles.org/dl/");

    const updateData = {
      props: {
        name: file?.name,
        url: fileURL,
      },
    };
    editor.updateBlock(block, updateData);
  });

  uppy.on("upload-error", (file: any, error: any) => {
    console.error("Upload error:", error);
  });

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView editor={editor} filePanel={false}>
      <FilePanelController
        filePanel={() => {
          return <Dashboard uppy={uppy} width={400} height={500} />;
        }}
      />
    </BlockNoteView>
  );
}
