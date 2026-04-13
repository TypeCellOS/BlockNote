import { useState } from "react";
import { useOnUploadEnd } from "./useOnUploadEnd.js";
import { useOnUploadStart } from "./useOnUploadStart.js";

/**
 * Tracks whether a file upload is in progress for a specific block. Returns
 * `true` while the upload is active and `false` otherwise.
 *
 * @param blockId - The ID of the block to monitor for upload activity.
 * @returns `true` if a file upload is currently in progress for the given block.
 */
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
