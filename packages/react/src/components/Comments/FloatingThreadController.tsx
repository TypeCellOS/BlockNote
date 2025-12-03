import { CommentsExtension } from "@blocknote/core/comments";
import { flip, offset, shift } from "@floating-ui/react";
import { ComponentProps, FC, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { PositionPopover } from "../Popovers/PositionPopover.js";
import { Thread } from "./Thread.js";
import { useThreads } from "./useThreads.js";

/**
 * This component is used to display a thread in a floating card.
 * It can be used when the user clicks on a thread / comment in the document.
 */
export default function FloatingThreadController(props: {
  floatingThread?: FC<ComponentProps<typeof Thread>>;
  floatingUIOptions?: FloatingUIOptions;
}) {
  const editor = useBlockNoteEditor<any, any, any>();

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

  const threads = useThreads();

  const thread = useMemo(
    () => (selectedThread ? threads.get(selectedThread.id) : undefined),
    [selectedThread, threads],
  );

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open: !!selectedThread,
        // Needed as hooks like `useDismiss` call `onOpenChange` to change the
        // open state.
        onOpenChange: (open, _event, reason) => {
          if (reason === "escape-key") {
            editor.focus();
          }

          if (!open) {
            comments.selectThread(undefined);
          }
        },
        placement: "bottom",
        middleware: [offset(10), shift(), flip()],
      },
      elementProps: {
        style: {
          zIndex: 30,
        },
      },
      ...props.floatingUIOptions,
    }),
    [comments, editor, props.floatingUIOptions, selectedThread],
  );

  // nice to have improvements:
  // - transition transform property so composer box animates when remote document is changed

  const Component = props.floatingThread || Thread;

  return (
    <PositionPopover position={selectedThread?.position} {...floatingUIOptions}>
      {thread && <Component thread={thread} selected={true} />}
    </PositionPopover>
  );
}
