import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  ImageToolbarState,
  InlineContentSchema,
  StyleSchema,
  UiElementPosition,
} from "@blocknote/core";

export type ImageToolbarProps<
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = Omit<ImageToolbarState<I, S>, keyof UiElementPosition>;