import { createBlockConfig } from "@blocknote/core";

export const createMermaidBlockConfig = createBlockConfig(
  () =>
    ({
      type: "mermaid" as const,
      propSchema: {},
      content: "inline" as const,
    }) as const,
);

export type MermaidBlockConfig = ReturnType<typeof createMermaidBlockConfig>;
