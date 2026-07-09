import {
  createBlockConfig,
  SourceBlockWithPreviewExtension,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

import {
  parseDiagramCodeContent,
  parseDiagramCodeElement,
} from "./helpers/parse/parseDiagramCodeElement.js";
import { DiagramBlockPreviewWithPopup } from "./helpers/render/DiagramBlockPreviewWithPopup.js";

export const createDiagramBlockConfig = createBlockConfig(
  () =>
    ({
      type: "diagram" as const,
      // The block is semantically a diagram; Mermaid is its (only, for now)
      // rendering engine. An `engine` prop with a "mermaid" default can be
      // added later without breaking stored documents.
      propSchema: {},
      content: "inline" as const,
    }) as const,
);

export type DiagramBlockConfig = ReturnType<typeof createDiagramBlockConfig>;

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
    toExternalHTML: (props) => (
      <pre>
        <code
          className="language-mermaid"
          data-language="mermaid"
          ref={props.contentRef}
        />
      </pre>
    ),
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
