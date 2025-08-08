import { FileBlockConfig } from "@blocknote/core";
import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
  ResizableFileWithCaption,
} from "@blocknote/react";

import { RiFilePdfFill } from "react-icons/ri";

import "./styles.css";

export const PDFPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  >,
) => (
  <embed
    type={"application/pdf"}
    src={props.block.props.url}
    contentEditable={false}
    draggable={false}
    onClick={() => props.editor.setTextCursorPosition(props.block)}
  />
);

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
        default: undefined,
        type: "number",
      },
    },
    content: "none",
    isFileBlock: true,
  },
  {
    render: (props) => (
      <ResizableFileWithCaption
        {...(props as any)}
        buttonText={"Add PDF"}
        buttonIcon={<RiFilePdfFill size={24} />}
      >
        <PDFPreview {...(props as any)} />
      </ResizableFileWithCaption>
    ),
  },
);
