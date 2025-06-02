import { createReactInlineContentSpec } from "@blocknote/react";
import { Reference } from "./Reference";
import "./styles.css";

export const ReferenceInlineBlock = createReactInlineContentSpec(
  {
    type: "reference",
    propSchema: {
      key: {
        type: "number",
        default: 1,
        description: "The key for the reference.",
      },
      doi: {
        default: "Unknown",
      },
      author: {
        type: "string",
        default: "Unknown Author",
      },
      title: {
        type: "string",
        default: "Unknown Title",
      },
      journal: {
        type: "string",
        default: "Unknown Journal",
      },
      year: {
        type: "number",
        default: 2023,
      },
    },
    content: "none",
  },
  {
    render: Reference,
  },
);
