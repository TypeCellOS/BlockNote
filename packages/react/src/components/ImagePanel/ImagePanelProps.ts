import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  ImagePanelState,
  InlineContentSchema,
  StyleSchema,
  UiElementPosition,
} from "@blocknote/core";

export type ImagePanelProps<
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = Omit<ImagePanelState<I, S>, keyof UiElementPosition>;
