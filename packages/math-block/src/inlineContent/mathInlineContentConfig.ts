import { CustomInlineContentConfig } from "@blocknote/core";

export const mathInlineContentConfig = {
  type: "inlineMath" as const,
  propSchema: {},
  content: "styled" as const,
} satisfies CustomInlineContentConfig;

export type MathInlineContentConfig = typeof mathInlineContentConfig;
