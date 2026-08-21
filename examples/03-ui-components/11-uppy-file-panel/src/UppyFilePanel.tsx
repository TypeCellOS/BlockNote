import { uploadFile_DEV_ONLY } from "@blocknote/core";
import { FilePanelProps, useBlockNoteEditor } from "@blocknote/react";
import Uppy, { UploadCompleteCallback } from "@uppy/core";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import { Dashboard } from "@uppy/react";
import { useEffect } from "react";

// Image editor plugin
import ImageEditor from "@uppy/image-editor";
import "@uppy/image-editor/dist/style.min.css";

// Screen capture plugin
import ScreenCapture from "@uppy/screen-capture";
import "@uppy/screen-capture/dist/style.min.css";

// Webcam plugin
import Webcam from "@uppy/webcam";
import "@uppy/webcam/dist/style.min.css";

// Configure your Uppy instance here.
const uppy = new Uppy()
  // Enabled plugins - you probably want to customize this
  // See https://uppy.io/examples/ for all the integrations like Google Drive,
  // Instagram Dropbox etc.
  .use(Webcam)
  .use(ScreenCapture)
  .use(ImageEditor);

// No uploader plugin is registered: for this demo we "upload" files with
// BlockNote's dev-only helper, which encodes them as base64 data URLs. In a real
// app you'd add an uploader like `@uppy/xhr-upload` pointing at your own backend
// or Uppy Companion server.

export function UppyFilePanel(props: FilePanelProps) {
  const { blockId } = props;
  const editor = useBlockNoteEditor();

  useEffect(() => {
    // Listen for completed Dashboard uploads, then update the Block with the
    // uploaded file's URL.
    const handler: UploadCompleteCallback<Record<string, unknown>> = async (
      result,
    ) => {
      for (const file of result.successful) {
        editor.updateBlock(blockId, {
          props: {
            name: file.name,
            url: await uploadFile_DEV_ONLY(file.data as File),
          },
        });

        // File should be removed from the Uppy instance after upload.
        uppy.removeFile(file.id);
      }
    };
    uppy.on("complete", handler);
    return () => {
      uppy.off("complete", handler);
    };
  }, [blockId, editor]);

  // set up dashboard as in https://uppy.io/examples/
  return <Dashboard uppy={uppy} width={400} height={500} />;
}

// Implementation for the BlockNote `uploadFile` function.
// This function is used when for example, files are dropped into the editor.
export async function uploadFile(file: File) {
  return uploadFile_DEV_ONLY(file);
}
