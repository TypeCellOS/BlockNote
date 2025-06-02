import { createReactInlineContentSpec } from "@blocknote/react";
import { Reference } from "./Reference";
import "./styles.css";

export const ReferenceInlineBlock = createReactInlineContentSpec(
  {
    type: "reference",
    propSchema: {
      doi: {
        default: "Unknown",
      },
    },
    content: "none",
  },
  {
    render: Reference,
  },
);
