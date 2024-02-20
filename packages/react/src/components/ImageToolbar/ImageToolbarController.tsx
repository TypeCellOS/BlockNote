import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { flip, offset } from "@floating-ui/react";
import { FC } from "react";

import { useBlockNoteEditor } from "../../editor/BlockNoteContext";
import { useUIPluginState } from "../../hooks/useUIPluginState";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import { ImageToolbarProps } from "./ImageToolbarProps";
import { ImageToolbar } from "./mantine/ImageToolbar";

export const ImageToolbarController = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  imageToolbar?: FC<ImageToolbarProps<I, S>>;
}) => {
  const editor = useBlockNoteEditor<
    { image: DefaultBlockSchema["image"] },
    I,
    S
  >();

  if (!editor.imageToolbar) {
    throw new Error(
      "ImageToolbarController can only be used when BlockNote editor schema contains image block"
    );
  }

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

  const Component = props.imageToolbar || ImageToolbar;

  return (
    <div ref={ref} style={style}>
      <Component {...data} />
    </div>
  );
};
