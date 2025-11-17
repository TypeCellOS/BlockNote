import { posToDOMRect } from "@tiptap/core";
import { ReactNode, useMemo, useRef } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "./FloatingUIOptions.js";
import { GenericPopover } from "./GenericPopover.js";

export const PositionPopover = (
  props: FloatingUIOptions & {
    position: { from: number; to?: number } | undefined;
    children: ReactNode;
  },
) => {
  const { position, children, ...rest } = props;
  const { from, to } = position || {};

  const editor = useBlockNoteEditor<any, any, any>();
  const { headless } = editor;

  // Stores the last created `boundingClientRect` to use in case `position` is
  // not defined.
  const boundingClientRect = useRef<DOMRect>(new DOMRect());
  const virtualElement = useMemo(
    () => ({
      getBoundingClientRect: () => {
        if (from === undefined || to === undefined) {
          return boundingClientRect.current;
        }

        boundingClientRect.current = posToDOMRect(
          editor.prosemirrorView,
          from,
          to ?? from,
        );

        return boundingClientRect.current;
      },
      contextElement:
        // Use first child as the editor DOM element may itself be scrollable.
        // For FloatingUI to auto-update the position during scrolling, the
        // `contextElement` must be a descendant of the scroll container.
        !headless && editor.domElement?.firstChild instanceof Element
          ? editor.domElement.firstChild
          : undefined,
    }),
    [editor, headless, from, to],
  );

  return (
    <GenericPopover reference={virtualElement} {...rest}>
      {children}
    </GenericPopover>
  );
};
