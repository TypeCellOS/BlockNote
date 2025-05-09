import { FileBlockConfig } from "@blocknote/core";
import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
  ResizableFileBlockWrapper,
} from "@blocknote/react";

import { RiFilePdfFill } from "react-icons/ri";

import "./styles.css";

export const PDFPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  >
) => {
  return (
    <embed
      type={"application/pdf"}
      src={props.block.props.url}
      contentEditable={false}
      draggable={false}
      onClick={() => props.editor.setTextCursorPosition(props.block)}
    />
  );
};

export const PDF = createReactBlockSpec(
  {
    type: "pdf",
    propSchema: {
      name: {
        default: "" as const,
      },
      url: {
        default: "" as const,
      },
      caption: {
        default: "" as const,
      },
      showPreview: {
        default: true,
      },
      previewWidth: {
        default: 512,
      },
    },
    content: "none",
    isFileBlock: true,
  },
  {
    render: (props) => (
      <ResizableFileBlockWrapper
        {...(props as any)}
        bbuttonText={"Add PDF"}
        buttonIcon={<RiFilePdfFill size={24} />}>
        <PDFPreview {...(props as any)} />
      </ResizableFileBlockWrapper>
    ),
  }
);
