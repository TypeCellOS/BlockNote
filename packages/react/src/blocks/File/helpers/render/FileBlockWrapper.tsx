import { FileBlockConfig } from "@blocknote/core";
import { CSSProperties, ReactNode } from "react";

import { useUploadLoading } from "../../../../hooks/useUploadLoading.js";
import { ReactCustomBlockRenderProps } from "../../../../schema/ReactBlockSpec.js";
import { AddFileButton } from "./AddFileButton.js";
import { FileNameWithIcon } from "./FileNameWithIcon.js";

export const FileBlockWrapper = (
  props: Omit<
    ReactCustomBlockRenderProps<
      FileBlockConfig["type"],
      FileBlockConfig["propSchema"] & { showPreview?: { default: true } },
      FileBlockConfig["content"]
    >,
    "contentRef"
  > & {
    buttonIcon?: ReactNode;
    children?: ReactNode;
  } & {
    // These props & the `forwardRef` are just here so we can reuse this
    // component in `ResizableFileBlockWrapper`.
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    style?: CSSProperties;
  },
) => {
  const showLoader = useUploadLoading(props.block.id);

  return (
    <div
      className={"bn-file-block-content-wrapper"}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      style={props.style}
    >
      {showLoader ? (
        // Show loader while a file is being uploaded.
        <div className={"bn-file-loading-preview"}>Loading...</div>
      ) : props.block.props.url === "" ? (
        // Show the add file button if the file has not been uploaded yet.
        <AddFileButton {...props} />
      ) : (
        // Show the file preview, or the file name and icon.
        <>
          {props.block.props.showPreview === false || !props.children ? (
            // Show file name and icon.
            <FileNameWithIcon {...props} />
          ) : (
            // Show preview.
            props.children
          )}
          {props.block.props.caption && (
            // Show the caption if there is one.
            <p className={"bn-file-caption"}>{props.block.props.caption}</p>
          )}
        </>
      )}
    </div>
  );
};
