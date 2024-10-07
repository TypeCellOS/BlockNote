import { useState } from "react";
import { useOnUploadEnd } from "./useOnUploadEnd.js";
import { useOnUploadStart } from "./useOnUploadStart.js";

export function useUploadLoading(blockId?: string) {
  const [showLoader, setShowLoader] = useState(false);

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
