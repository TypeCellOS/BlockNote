import { FC } from "react";
import { flip, offset } from "@floating-ui/react";

import { useUIPluginState } from "../../hooks/useUIPluginState";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import { DefaultImageToolbar, ImageToolbarProps } from "./DefaultImageToolbar";
import { useBlockNoteEditor } from "../../editor/BlockNoteContext";
import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

export const DefaultPositionedImageToolbar = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  imageToolbar?: FC<ImageToolbarProps<BSchema, I, S>>;
}) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const state = useUIPluginState(
    editor.imageToolbar.onUpdate.bind(editor.imageToolbar)
  );
  const { isMounted, ref, style } = useUIElementPositioning(
    state?.show || false,
    state?.referencePos || null,
    5000,
    {
      placement: "bottom",
      middleware: [offset(10), flip()],
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  const { show, referencePos, ...data } = state;

  const ImageToolbar = props.imageToolbar || DefaultImageToolbar;

  return (
    <div ref={ref} style={style}>
      <ImageToolbar {...data} />
    </div>
  );
};
