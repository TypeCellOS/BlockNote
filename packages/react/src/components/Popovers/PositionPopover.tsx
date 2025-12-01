import { posToDOMRect } from "@tiptap/core";
import { ReactNode, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "./FloatingUIOptions.js";
import { GenericPopover, GenericPopoverReference } from "./GenericPopover.js";

export const PositionPopover = (
  props: FloatingUIOptions & {
    position: { from: number; to?: number } | undefined;
    children: ReactNode;
  },
) => {
  const { position, children, ...floatingUIOptions } = props;
  const { from, to } = position || {};

  const editor = useBlockNoteEditor<any, any, any>();

  const reference = useMemo<GenericPopoverReference | undefined>(() => {
    if (from === undefined || to === undefined) {
      return undefined;
    }

    return {
      // Use first child as the editor DOM element may itself be scrollable.
      // For FloatingUI to auto-update the position during scrolling, the
      // `contextElement` must be a descendant of the scroll container.
      element: editor.domElement?.firstElementChild || undefined,
      getBoundingClientRect: () =>
        posToDOMRect(editor.prosemirrorView, from, to ?? from),
    };
  }, [editor, from, to]);

  return (
    <GenericPopover reference={reference} {...floatingUIOptions}>
      {position !== undefined && children}
    </GenericPopover>
  );
};
