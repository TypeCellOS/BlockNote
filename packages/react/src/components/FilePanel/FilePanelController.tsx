import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  FilePanelExtension,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { UseFloatingOptions, flip, offset } from "@floating-ui/react";
import { FC } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning.js";
import { FilePanel } from "./FilePanel.js";
import { FilePanelProps } from "./FilePanelProps.js";
import { usePluginState } from "../../hooks/usePlugin.js";

export const FilePanelController = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  filePanel?: FC<FilePanelProps>;
  floatingOptions?: Partial<UseFloatingOptions>;
}) => {
  const editor = useBlockNoteEditor<B, I, S>();

  if (!editor.filePanel) {
    throw new Error(
      "FileToolbarController can only be used when BlockNote editor schema contains file block",
    );
  }

  const state = usePluginState(FilePanelExtension);

  const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
    !!state?.blockId,
    state?.referencePos || null,
    5000,
    {
      placement: "bottom",
      middleware: [offset(10), flip()],
      onOpenChange: (open) => {
        if (!open) {
          editor.filePanel!.closeMenu();
          editor.focus();
        }
      },
      ...props.floatingOptions,
    },
  );

  if (!isMounted || !state) {
    return null;
  }

  const Component = props.filePanel || FilePanel;

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      {state.blockId && <Component blockId={state.blockId} />}
    </div>
  );
};
