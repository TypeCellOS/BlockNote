import { createBlockConfig } from "@blocknote/core";

export const createMathBlockConfig = createBlockConfig(
  () =>
    ({
      type: "math" as const,
      propSchema: {},
      content: "inline" as const,
    }) as const,
);

export type MathBlockConfig = ReturnType<typeof createMathBlockConfig>;
