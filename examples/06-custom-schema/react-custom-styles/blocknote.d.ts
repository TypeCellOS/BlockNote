import "@blocknote/core";
import type { schema } from "./App";

declare module "@blocknote/core" {
  type DefaultStyleSchema = typeof schema.styleSchema;
  type DefaultBlockSchema = typeof schema.blockSchema;
  type DefaultInlineContentSchema = typeof schema.inlineContentSchema;
}
