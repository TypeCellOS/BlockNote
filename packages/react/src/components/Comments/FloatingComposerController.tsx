import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { UseFloatingOptions, flip, offset } from "@floating-ui/react";
import { ComponentProps, FC, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { FloatingComposer } from "./FloatingComposer.js";

export const FloatingComposerController = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  floatingComposer?: FC<ComponentProps<typeof FloatingComposer>>;
  floatingOptions?: Partial<UseFloatingOptions>;
}) => {
  const editor = useBlockNoteEditor<B, I, S>();

  if (!editor.comments) {
    throw new Error(
      "FloatingComposerController can only be used when BlockNote editor has enabled comments"
    );
  }

  const comments = editor.comments;

  const state = useUIPluginState(comments.onUpdate.bind(comments));

  const referencePos = useMemo(() => {
    if (!state?.pendingComment) {
      return null;
    }

    // TODO: update referencepos when doc changes (remote updates)
    return editor.getSelectionBoundingBox();
  }, [editor, state?.pendingComment]);

  // TODO: review
  const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
    state?.pendingComment || false,
    referencePos || null,
    5000,
    {
      placement: "bottom",
      middleware: [offset(10), flip()],
      onOpenChange: (open) => {
        if (!open) {
          // TODO
          comments.stopPendingComment();
          editor.focus();
        }
      },
      ...props.floatingOptions,
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  const Component = props.floatingComposer || FloatingComposer;

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <Component />
    </div>
  );
};
