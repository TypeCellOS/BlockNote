import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { UseFloatingOptions, flip, offset, shift } from "@floating-ui/react";
import { ComponentProps, FC, useEffect } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useEditorSelectionBoundingBox } from "../../hooks/useEditorSelectionBoundingBox.js";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { FloatingComposer } from "./FloatingComposer.js";

export const FloatingComposerController = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  floatingComposer?: FC<ComponentProps<typeof FloatingComposer>>;
  floatingOptions?: Partial<UseFloatingOptions>;
}) => {
  const editor = useBlockNoteEditor<B, I, S>();

  if (!editor.comments) {
    throw new Error(
      "FloatingComposerController can only be used when BlockNote editor has enabled comments",
    );
  }

  const comments = editor.comments;
  useEffect(() => {
    const offUpdate = comments.onUpdate((state) =>
      editor.setForceSelectionVisible(state.pendingComment),
    );

    return () => offUpdate();
  }, [comments, editor]);

  const state = useUIPluginState(comments.onUpdate.bind(comments));

  // the reference position is updated automatically when the selection moves,
  // this can happen when the document is updated by a remote user
  const referencePos = useEditorSelectionBoundingBox(state?.pendingComment);

  const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
    state?.pendingComment || false,
    referencePos || null,
    5000,
    {
      placement: "bottom",
      middleware: [offset(10), shift(), flip()],
      onOpenChange: (open) => {
        if (!open) {
          comments.stopPendingComment();
          editor.focus();
        }
      },
      ...props.floatingOptions,
    },
  );

  if (!isMounted || !state) {
    return null;
  }

  // nice to have improvements would be:
  // - transition transform property so composer box animates when remote document is changed
  // - fade out on close

  const Component = props.floatingComposer || FloatingComposer;

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <Component />
    </div>
  );
};
