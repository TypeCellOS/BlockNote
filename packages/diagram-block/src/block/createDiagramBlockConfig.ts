import { createBlockConfig } from "@blocknote/core";

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
