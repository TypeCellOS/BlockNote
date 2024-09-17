import { useState } from "react";
import { useOnUploadStart } from "./useOnUploadStart";
import { useOnUploadEnd } from "./useOnUploadEnd";

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
