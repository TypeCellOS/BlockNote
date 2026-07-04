import { SourceBlockWithPreviewExtension } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

import { createMermaidBlockConfig } from "../createMermaidBlockConfig.js";
import { MermaidBlockPreviewWithPopup } from "./render/MermaidBlockPreviewWithPopup.js";

export const createReactMermaidBlockSpec = createReactBlockSpec(
  createMermaidBlockConfig,
  {
    meta: {
      code: true,
      defining: true,
      isolating: false,
    },
    render: MermaidBlockPreviewWithPopup,
  },
  [
    // Mermaid blocks always render a preview. Diagram sources span multiple
    // lines, so Enter inserts a line break instead of closing the popup.
    SourceBlockWithPreviewExtension({
      key: "mermaid-block-preview",
      blockType: "mermaid",
      hasPreview: () => true,
      multiline: true,
    }),
  ],
);


