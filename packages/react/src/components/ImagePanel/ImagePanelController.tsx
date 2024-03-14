import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { flip, offset } from "@floating-ui/react";
import { FC } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import { useUIPluginState } from "../../hooks/useUIPluginState";
import { ImagePanelProps } from "./ImagePanelProps";
import { ImagePanel } from "./mantine/ImagePanel";

export const ImagePanelController = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  imageToolbar?: FC<ImagePanelProps<I, S>>;
}) => {
  const editor = useBlockNoteEditor<
    { image: DefaultBlockSchema["image"] },
    I,
    S
  >();

  if (!editor.imagePanel) {
    throw new Error(
      "ImageToolbarController can only be used when BlockNote editor schema contains image block"
    );
  }

  const state = useUIPluginState(
    editor.imagePanel.onUpdate.bind(editor.imagePanel)
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

  const Component = props.imageToolbar || ImagePanel;

  return (
    <div ref={ref} style={style}>
      <Component {...data} />
    </div>
  );
};
