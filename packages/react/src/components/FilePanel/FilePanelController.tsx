import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { UseFloatingOptions, flip, offset } from "@floating-ui/react";
import { FC } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { FilePanel } from "./FilePanel.js";
import { FilePanelProps } from "./FilePanelProps.js";

export const FilePanelController = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  filePanel?: FC<FilePanelProps<I, S>>;
  floatingOptions?: Partial<UseFloatingOptions>;
}) => {
  const editor = useBlockNoteEditor<B, I, S>();

  if (!editor.filePanel) {
    throw new Error(
      "FileToolbarController can only be used when BlockNote editor schema contains file block",
    );
  }

  const state = useUIPluginState(
    editor.filePanel.onUpdate.bind(editor.filePanel),
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

  const { show, referencePos, ...data } = state;

  const Component = props.filePanel || FilePanel;

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <Component {...data} />
    </div>
  );
};
