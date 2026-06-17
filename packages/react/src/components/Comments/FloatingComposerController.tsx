import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { CommentsExtension } from "@blocknote/core/comments";
import { flip, offset, shift } from "@floating-ui/react";
import { ComponentProps, FC, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useEditorState } from "../../hooks/useEditorState.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { PositionPopover } from "../Popovers/PositionPopover.js";
import { defaultCommentEditorSchema } from "./defaultCommentEditorSchema.js";
import { FloatingComposer } from "./FloatingComposer.js";

export default function FloatingComposerController<
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  floatingComposer?: FC<ComponentProps<typeof FloatingComposer>>;
  floatingUIOptions?: FloatingUIOptions;
  /**
   * Override the DOM node this floating element portals into. Falls back to
   * `editor.portalElement` (which by default is mounted inside `bn-container`)
   * when omitted.
   */
  portalElement?: HTMLElement | null;
}) {
  const editor = useBlockNoteEditor<B, I, S>();
  const dict = useDictionary();

  const comments = useExtension(CommentsExtension);

  const pendingComment = useExtensionState(CommentsExtension, {
    editor,
    selector: (state) => state.pendingComment,
  });

  // The editor used to compose a new comment. We own it here (rather than in
  // `FloatingComposer`) so that the dismiss handler below can check whether the
  // user has typed anything before discarding it. A fresh editor is created for
  // each pending comment, so it always starts empty.
  const newCommentEditor = useCreateBlockNote(
    {
      trailingBlock: false,
      dictionary: {
        ...dict,
        placeholders: {
          emptyDocument: dict.placeholders.new_comment,
        },
      },
      schema: comments.commentEditorSchema || defaultCommentEditorSchema,
    },
    [pendingComment],
  );

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
      ...props.floatingUIOptions,
      useFloatingOptions: {
        open: !!pendingComment,
        // Needed as hooks like `useDismiss` call `onOpenChange` to change the
        // open state.
        onOpenChange: (open) => {
          if (!open) {
            // If the user has typed a comment that hasn't been saved yet, ask
            // for confirmation before discarding it (e.g. when clicking
            // outside the composer). Otherwise the unsaved comment is lost.
            if (
              !newCommentEditor.isEmpty &&
              !window.confirm(dict.comments.discard_pending_comment)
            ) {
              // Keep the composer open so the user can continue editing.
              return;
            }
            comments.stopPendingComment();
            editor.focus();
          }
        },
        placement: "bottom",
        middleware: [offset(10), shift(), flip()],
        ...props.floatingUIOptions?.useFloatingOptions,
      },
      focusManagerProps: {
        disabled: false,
      },
      elementProps: {
        style: {
          zIndex: 60,
        },
        ...props.floatingUIOptions?.elementProps,
      },
    }),
    [
      comments,
      dict,
      editor,
      newCommentEditor,
      pendingComment,
      props.floatingUIOptions,
    ],
  );

  // nice to have improvements would be:
  // - transition transform property so composer box animates when remote document is changed
  // - fade out on close

  const Component = props.floatingComposer || FloatingComposer;

  return (
    <PositionPopover
      position={position}
      portalElement={props.portalElement}
      {...floatingUIOptions}
    >
      <Component newCommentEditor={newCommentEditor} />
    </PositionPopover>
  );
}
