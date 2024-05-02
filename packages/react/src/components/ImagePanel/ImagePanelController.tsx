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
import { ImagePanel } from "./ImagePanel";
import { ImagePanelProps } from "./ImagePanelProps";

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

  const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
    state?.show || false,
    state?.referencePos || null,
    5000,
    {
      placement: "bottom",
      middleware: [offset(10), flip()],
      onOpenChange: (open) => {
        if (!open) {
          editor.imagePanel!.closeMenu();
          editor.focus();
        }
      },
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  const { show, referencePos, ...data } = state;

  const Component = props.imageToolbar || ImagePanel;

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <Component {...data} />
    </div>
  );
};
