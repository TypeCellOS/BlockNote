import { useState } from "react";
import { useOnUploadStart } from "./useOnUploadStart";
import { useOnUploadEnd } from "./useOnUploadEnd";
import { useBlockNoteEditor } from "./useBlockNoteEditor";

export function useUploadLoading(blockId?: string) {
  const editor = useBlockNoteEditor();

  const [showLoader, setShowLoader] = useState(
    editor.fileUploadStatus.uploading
  );

  useOnUploadStart((uploadBlockId) => {
    if (uploadBlockId === blockId) {
      setShowLoader(true);
    }
  });

  useOnUploadEnd((uploadBlockId) => {
    if (uploadBlockId === blockId) {
      setShowLoader(false);
    }
  });

  return showLoader;
}
