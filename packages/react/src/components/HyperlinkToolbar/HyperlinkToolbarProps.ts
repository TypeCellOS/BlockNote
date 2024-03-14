import {
  BlockNoteEditor,
  BlockSchema,
  HyperlinkToolbarState,
  InlineContentSchema,
  StyleSchema,
  UiElementPosition,
} from "@blocknote/core";

export type HyperlinkToolbarProps = Omit<
  HyperlinkToolbarState,
  keyof UiElementPosition
> &
  Pick<
    BlockNoteEditor<
      BlockSchema,
      InlineContentSchema,
      StyleSchema
    >["hyperlinkToolbar"],
    "deleteHyperlink" | "editHyperlink" | "startHideTimer" | "stopHideTimer"
  >;