import { FilePanelProps, useBlockNoteEditor } from "@blocknote/react";
import Uppy, { UploadSuccessCallback } from "@uppy/core";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import { Dashboard } from "@uppy/react";
import XHR from "@uppy/xhr-upload";
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
  .use(ImageEditor)

  // Uses an XHR upload plugin to upload files to tmpfiles.org.
  // You want to replace this with your own upload endpoint or Uppy Companion
  // server.
  .use(XHR, {
    endpoint: "https://tmpfiles.org/api/v1/upload",
    getResponseData(text, resp) {
      return {
        url: JSON.parse(text).data.url.replace(
          "tmpfiles.org/",
          "tmpfiles.org/dl/"
        ),
      };
    },
  });

export function UppyFilePanel(props: FilePanelProps) {
  const { block } = props;
  const editor = useBlockNoteEditor();

  useEffect(() => {
    // Listen for successful tippy uploads, and then update the Block with the
    // uploaded URL.
    const handler: UploadSuccessCallback<Record<string, unknown>> = (
      file,
      response
    ) => {
      if (!file) {
        return;
      }

      if (file.source === "uploadFile") {
        // Didn't originate from Dashboard, should be handled by `uploadFile`
        return;
      }
      if (response.status === 200) {
        const updateData = {
          props: {
            name: file?.name,
            url: response.uploadURL,
          },
        };
        editor.updateBlock(block, updateData);

        // File should be removed from the Uppy instance after upload.
        uppy.removeFile(file.id);
      }
    };
    uppy.on("upload-success", handler);
    return () => {
      uppy.off("upload-success", handler);
    };
  }, [block, editor]);

  // set up dashboard as in https://uppy.io/examples/
  return <Dashboard uppy={uppy} width={400} height={500} />;
}

// Implementation for the BlockNote `uploadFile` function.
// This function is used when for example, files are dropped into the editor.
export async function uploadFile(file: File) {
  const id = uppy.addFile({
    id: file.name,
    name: file.name,
    type: file.type,
    data: file,
    source: "uploadFile",
  });

  try {
    const result = await uppy.upload();
    return result.successful[0].response!.uploadURL!;
  } finally {
    uppy.removeFile(id);
  }
}
