import {
  baseFileZodPropSchema,
  createPropSchemaFromZod,
  FileBlockConfig,
  optionalFileZodPropSchema,
} from "@blocknote/core";
import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
  ResizableFileBlockWrapper,
} from "@blocknote/react";
import { z } from "zod/v4";

import { RiFilePdfFill } from "react-icons/ri";

import "./styles.css";

export const PDFPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<
      FileBlockConfig["type"],
      FileBlockConfig["propSchema"],
      FileBlockConfig["content"]
    >,
    "contentRef"
  >,
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
    propSchema: createPropSchemaFromZod(
      z.object({}).extend({
        ...baseFileZodPropSchema.shape,
        ...optionalFileZodPropSchema.pick({
          url: true,
          showPreview: true,
          previewWidth: true,
        }).shape,
      }),
    ),
    content: "none",
  },
  {
    meta: {
      fileBlockAccept: ["application/pdf"],
    },
    render: (props) => (
      <ResizableFileBlockWrapper
        {...(props as any)}
        buttonIcon={<RiFilePdfFill size={24} />}
      >
        <PDFPreview {...(props as any)} />
      </ResizableFileBlockWrapper>
    ),
  },
);
