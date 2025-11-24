import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { CommentsExtension } from "@blocknote/core/comments";
import { ShowSelectionExtension } from "@blocknote/core/extensions";
import { flip, offset, shift } from "@floating-ui/react";
import { ComponentProps, FC, useEffect, useMemo, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { FloatingComposer } from "./FloatingComposer.js";
import { PositionPopover } from "../Popovers/PositionPopover.js";
import { useEditorState } from "../../hooks/useEditorState.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";

export default function FloatingComposerController<
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  floatingComposer?: FC<ComponentProps<typeof FloatingComposer>>;
  floatingUIOptions?: FloatingUIOptions;
}) {
  const [open, setOpen] = useState(false);

  const editor = useBlockNoteEditor<B, I, S>();

  const comments = useExtension(CommentsExtension);
  const showSelection = useExtension(ShowSelectionExtension);

  useEffect(() => {
    const offUpdate = comments.onUpdate((state) =>
      showSelection.showSelection(!!state.pendingComment),
    );

    return () => {
      offUpdate();
    };
  }, [comments, editor, showSelection]);

  const pendingComment = useExtensionState(CommentsExtension, {
    editor,
    selector: (state) => state.pendingComment,
  });
  useEffect(() => {
    setOpen(pendingComment);
  }, [pendingComment]);

  const position = useEditorState({
    editor,
    selector: ({ editor }) =>
      pendingComment
        ? {
            from: editor.prosemirrorState.selection.from,
            to: editor.prosemirrorState.selection.to,
          }
        : undefined,
  });

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open,
        // Needed as hooks like `useDismiss` call `onOpenChange` to change the
        // open state.
        onOpenChange: (open) => {
          if (!open) {
            comments.stopPendingComment();
            editor.focus();
          }

          setOpen(open);
        },
        placement: "bottom",
        middleware: [offset(10), shift(), flip()],
      },
      elementProps: {
        style: {
          zIndex: 60,
        },
      },
      ...props.floatingUIOptions,
    }),
    [comments, editor, open, props.floatingUIOptions],
  );

  // nice to have improvements would be:
  // - transition transform property so composer box animates when remote document is changed
  // - fade out on close

  const Component = props.floatingComposer || FloatingComposer;

  return (
    <PositionPopover position={position} {...floatingUIOptions}>
      <Component />
    </PositionPopover>
  );
}
