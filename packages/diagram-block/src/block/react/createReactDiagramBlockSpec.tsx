import { SourceBlockWithPreviewExtension } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

import { createDiagramBlockConfig } from "../createDiagramBlockConfig.js";
import { DiagramBlockPreviewWithPopup } from "./render/DiagramBlockPreviewWithPopup.js";

export const createReactDiagramBlockSpec = createReactBlockSpec(
  createDiagramBlockConfig,
  {
    meta: {
      code: true,
      defining: true,
      isolating: false,
    },
    render: DiagramBlockPreviewWithPopup,
  },
  [
    // Diagram blocks always render a preview. Diagram sources span multiple
    // lines, so Enter inserts a line break instead of closing the popup.
    SourceBlockWithPreviewExtension({
      key: "diagram-block-preview",
      blockType: "diagram",
      hasPreview: () => true,
      multiline: true,
    }),
  ],
);


