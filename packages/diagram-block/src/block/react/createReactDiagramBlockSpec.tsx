import { SourceBlockWithPreviewExtension } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

import { createDiagramBlockConfig } from "../createDiagramBlockConfig.js";
import {
  parseDiagramCodeContent,
  parseDiagramCodeElement,
} from "../shared/parse/parseDiagramCodeElement.js";
import { DiagramBlockPreviewWithPopup } from "./DiagramBlockPreviewWithPopup.js";

export const createReactDiagramBlockSpec = createReactBlockSpec(
  createDiagramBlockConfig,
  {
    meta: {
      code: true,
      defining: true,
      isolating: false,
    },
    parse: parseDiagramCodeElement,
    parseContent: parseDiagramCodeContent,
    // The code block also parses `<pre><code>` elements, so the diagram's
    // rule must be tried first to claim the `language-mermaid` ones.
    runsBefore: ["codeBlock"],
    render: DiagramBlockPreviewWithPopup,
    toExternalHTML: (props) => <pre><code className="language-mermaid" data-language="mermaid" ref={props.contentRef} /></pre>,
  },
  [
    // Diagram blocks always render a preview. Diagram sources span multiple
    // lines, so Enter inserts a line break instead of closing the popup.
    SourceBlockWithPreviewExtension({
      key: "diagram-block-preview",
      blockType: "diagram",
      hasPreview: () => true,
      enterBehaviour: "newline",
    }),
  ],
);
