/* eslint-disable import/no-extraneous-dependencies */
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FilePanelController,
  FilePanelProps,
  useBlockNoteEditor,
  useCreateBlockNote,
} from "@blocknote/react";
import { Dashboard } from "@uppy/react/";
import XHR from "@uppy/xhr-upload";
import { useEffect } from "react";

import Uppy, { UploadSuccessCallback } from "@uppy/core";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

// image editor plugin
import ImageEditor from "@uppy/image-editor";
import "@uppy/image-editor/dist/style.min.css";

// screen capture plugin
import ScreenCapture from "@uppy/screen-capture";
import "@uppy/screen-capture/dist/style.min.css";

// webcam plugin
import Webcam from "@uppy/webcam";
import "@uppy/webcam/dist/style.min.css";

/**
 * Configure your Uppy instance here.
 */
const uppy = new Uppy()
  /* enable some plugins, you probably want to customize this
   * See https://uppy.io/examples/ for all the integrations like Google Drive, Instagram Dropbox etc.
   */
  .use(Webcam)
  .use(ScreenCapture)
  .use(ImageEditor)

  /* In this example, we use an XHR upload plugin to upload files to tmpfiles.org,
 * you want to replace this with your own upload endpoint or Uppy Companion server
 *

 */
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

function UppyFilePanel(props: FilePanelProps) {
  const { block } = props;
  const editor = useBlockNoteEditor();

  useEffect(() => {
    /**
     * Listen for successful tippy uploads, and then update the Block with the uploaded URL
     */
    const handler: UploadSuccessCallback<Record<string, unknown>> = (
      file,
      response
    ) => {
      debugger;
      if (!file) {
        return;
      }

      if (file.source === "uploadFile") {
        // didn't originate from Dashboard. Should be handled by `uploadFile`
        return;
      }
      if (response.status === 200) {
        // get the correct URL ()

        const updateData = {
          props: {
            name: file?.name,
            url: response.uploadURL,
          },
        };
        editor.updateBlock(block, updateData);

        // File should be removed from the uppy instance after successful upload.
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

/**
 * Implementation for the BlockNote `uploadFile` function.
 *
 * This function is used when for example, files are dropped into the editor
 */
async function uploadFile(file: File) {
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
  return (
    <BlockNoteView editor={editor} filePanel={false}>
      <FilePanelController filePanel={UppyFilePanel} />
    </BlockNoteView>
  );
}
