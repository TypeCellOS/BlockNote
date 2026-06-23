import { CommentsExtension } from "@blocknote/core/comments";
import { flip, offset, shift } from "@floating-ui/react";
import { ComponentProps, FC, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { PositionPopover } from "../Popovers/PositionPopover.js";
import { confirmDiscardUnsavedComment } from "./confirmDiscardUnsavedComment.js";
import { defaultCommentEditorSchema } from "./defaultCommentEditorSchema.js";
import { Thread } from "./Thread.js";
import { useThreads } from "./useThreads.js";

/**
 * This component is used to display a thread in a floating card.
 * It can be used when the user clicks on a thread / comment in the document.
 */
export default function FloatingThreadController(props: {
  floatingThread?: FC<ComponentProps<typeof Thread>>;
  floatingUIOptions?: FloatingUIOptions;
  /**
   * Override the DOM node this floating element portals into. Falls back to
   * `editor.portalElement` (which by default is mounted inside `bn-container`)
   * when omitted.
   */
  portalElement?: HTMLElement | null;
}) {
  const editor = useBlockNoteEditor<any, any, any>();
  const dict = useDictionary();

  const comments = useExtension(CommentsExtension);

  const selectedThread = useExtensionState(CommentsExtension, {
    editor,
    selector: (state) =>
      state.selectedThreadId
        ? {
            id: state.selectedThreadId,
            position: state.threadPositions.get(state.selectedThreadId),
          }
        : undefined,
  });

  // The editor used to compose a reply. We own it here (rather than in
  // `Thread`) so the dismiss handler below can check whether the user has typed
  // anything before discarding it. A fresh editor is created for each thread,
  // so it always starts empty.
  const newCommentEditor = useCreateBlockNote(
    {
      trailingBlock: false,
      dictionary: {
        ...dict,
        placeholders: {
          emptyDocument: dict.placeholders.comment_reply,
        },
      },
      schema: comments.commentEditorSchema || defaultCommentEditorSchema,
    },
    [selectedThread?.id],
  );

  const threads = useThreads();

  const thread = useMemo(
    () => (selectedThread ? threads.get(selectedThread.id) : undefined),
    [selectedThread, threads],
  );

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      ...props.floatingUIOptions,
      useFloatingOptions: {
        open: !!selectedThread,
        // Needed as hooks like `useDismiss` call `onOpenChange` to change the
        // open state.
        onOpenChange: (open, _event, reason) => {
          if (!open) {
            // If the user has typed an unsaved reply, ask for confirmation
            // before discarding it (e.g. when clicking outside the card).
            // Otherwise the unsaved reply is lost.
            if (
              !confirmDiscardUnsavedComment({
                hasUnsavedContent: !newCommentEditor.isEmpty,
                confirmBeforeDiscard: comments.confirmBeforeDiscard,
                message: dict.comments.discard_pending_comment,
              })
            ) {
              // Keep the thread open so the user can finish their reply.
              return;
            }

            if (reason === "escape-key") {
              editor.focus();
            }
            comments.selectThread(undefined);
          }
        },
        placement: "bottom",
        middleware: [offset(10), shift(), flip()],
        ...props.floatingUIOptions?.useFloatingOptions,
      },
      focusManagerProps: {
        disabled: true,
        ...props.floatingUIOptions?.focusManagerProps,
      },
      elementProps: {
        style: {
          zIndex: 30,
        },
        ...props.floatingUIOptions?.elementProps,
      },
    }),
    [
      comments,
      dict,
      editor,
      newCommentEditor,
      props.floatingUIOptions,
      selectedThread,
    ],
  );

  // nice to have improvements:
  // - transition transform property so composer box animates when remote document is changed

  const Component = props.floatingThread || Thread;

  return (
    <PositionPopover
      position={selectedThread?.position}
      portalElement={props.portalElement}
      {...floatingUIOptions}
    >
      {thread && (
        <Component
          thread={thread}
          selected={true}
          newCommentEditor={newCommentEditor}
        />
      )}
    </PositionPopover>
  );
}
