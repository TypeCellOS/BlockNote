import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { flip, offset } from "@floating-ui/react";
import { FC } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import { useUIPluginState } from "../../hooks/useUIPluginState";
import { AIToolbar } from "./AIToolbar";
import { AIToolbarProps } from "./AIToolbarProps";

export const AIToolbarController = (props: {
  aiToolbar?: FC<AIToolbarProps>;
}) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  if (!editor.aiToolbar) {
    throw new Error(
      "AIToolbarController can only be used when BlockNote editor schema contains an AI block"
    );
  }

  const state = useUIPluginState(
    editor.aiToolbar.onUpdate.bind(editor.aiToolbar)
  );

  const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
    state?.show || false,
    state?.referencePos || null,
    3000,
    {
      placement: "top-end",
      middleware: [offset(10), flip()],
      onOpenChange: (open) => {
        if (!open) {
          editor.linkToolbar.closeMenu();
          editor.focus();
        }
      },
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  const { prompt } = state;

  const Component = props.aiToolbar || AIToolbar;

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <Component prompt={prompt!} />
    </div>
  );
};
