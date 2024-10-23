import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { TableHandleProps } from "../TableHandleProps.js";

export type ExtendButtonProps<
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = Pick<
  TableHandleProps<I, S>,
  "block" | "editor" | "orientation" | "freezeHandles" | "unfreezeHandles"
>;
