import { CommentsPlugin } from "@blocknote/core";
import { flip, offset, shift } from "@floating-ui/react";
import { ComponentProps, FC, useEffect, useMemo, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { usePluginState } from "../../hooks/usePlugin.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { PositionPopover } from "../Popovers/PositionPopover.js";
import { Thread } from "./Thread.js";
import { useThreads } from "./useThreads.js";

/**
 * This component is used to display a thread in a floating card.
 * It can be used when the user clicks on a thread / comment in the document.
 */
export const FloatingThreadController = (props: {
  floatingThread?: FC<ComponentProps<typeof Thread>>;
  floatingUIOptions?: FloatingUIOptions;
}) => {
  const editor = useBlockNoteEditor<any, any, any>();

  const [open, setOpen] = useState(false);

  const selectedThread = usePluginState(CommentsPlugin, {
    editor,
    selector: (state) =>
      state.selectedThreadId
        ? {
            id: state.selectedThreadId,
            position: state.threadPositions.get(state.selectedThreadId),
          }
        : undefined,
  });
  useEffect(() => {
    setOpen(!!selectedThread);
  }, [selectedThread]);

  const threads = useThreads();

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open,
        // Needed as hooks like `useDismiss` call `onOpenChange` to change the
        // open state.
        onOpenChange: setOpen,
        placement: "bottom",
        middleware: [offset(10), shift(), flip()],
      },
      ...props.floatingUIOptions,
    }),
    [open, props.floatingUIOptions],
  );

  // nice to have improvements:
  // - fade out on close
  // - transition transform property so composer box animates when remote document is changed

  const Component = props.floatingThread || Thread;

  return (
    <PositionPopover position={selectedThread?.position} {...floatingUIOptions}>
      {selectedThread && (
        <Component thread={threads.get(selectedThread.id)!} selected={true} />
      )}
    </PositionPopover>
  );
};
