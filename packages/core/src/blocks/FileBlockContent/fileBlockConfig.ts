import { defaultProps } from "../defaultProps";
import { CustomBlockConfig, PropSchema } from "../../schema";

export const filePropSchema = {
  textAlignment: defaultProps.textAlignment,
  backgroundColor: defaultProps.backgroundColor,
  // File type.
  fileType: {
    default: "" as const,
  },
  // File url.
  url: {
    default: "" as const,
  },
  // File caption.
  caption: {
    default: "" as const,
  },
  // File width in px.
  previewWidth: {
    default: 512 as const,
  },
} satisfies PropSchema;

export const fileBlockConfig = {
  type: "file" as const,
  propSchema: filePropSchema,
  content: "none",
} satisfies CustomBlockConfig;
