import { createBlockConfig } from "@blocknote/core";
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
      // Diagram source is Mermaid, so highlight it as such when the syntax
      // highlighting extension is present.
      //
      // NOTE: this currently has no visible effect. Shiki's Mermaid grammar is
      // a Markdown injection (`injectionSelector: "L:text.html.markdown"`) that
      // only tokenizes inside a ```` ```mermaid ```` fence, so it produces no
      // tokens for bare Mermaid source. See
      // https://github.com/shikijs/shiki/issues/973 - once that's resolved
      // upstream, highlighting should start working with no change here.
      highlight: () => "mermaid",
      // Diagram blocks always render a preview. Diagram sources span multiple
      // lines, so Enter inserts a line break instead of closing the popup
      // (`hardBreakShortcut: "enter"`).
      hasPreview: true,
      hardBreakShortcut: "enter",
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
);
