import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { LinkToolbar as LinkToolbarExtension } from "@blocknote/core/extensions";
import { flip, offset, safePolygon } from "@floating-ui/react";
import { Range } from "@tiptap/core";
import { FC, useEffect, useMemo, useRef, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { LinkToolbar } from "./LinkToolbar.js";
import { LinkToolbarProps } from "./LinkToolbarProps.js";
import { useEditorState } from "../../hooks/useEditorState.js";
import { useExtension } from "../../hooks/useExtension.js";
import { GenericPopover } from "../Popovers/GenericPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";

export const LinkToolbarController = (props: {
  linkToolbar?: FC<LinkToolbarProps>;
  floatingUIOptions?: FloatingUIOptions;
}) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const [open, setOpen] = useState(false);
  const [frozen, setFrozen] = useState(false);

  const linkToolbar = useExtension(LinkToolbarExtension);
  const selectionLink = useEditorState({
    editor,
    selector: () => {
      const link = linkToolbar.getLinkAtSelection();
      if (!link) {
        return undefined;
      }

      return {
        url: link.mark.attrs.href as string,
        text: link.text,
        range: link.range,
        element: linkToolbar.getLinkElementAtPos(link.range.from)!,
      };
    },
  });
  useEffect(() => {
    if (frozen) {
      return;
    }

    setOpen(!!selectionLink);
    if (selectionLink) {
      // Clears the link hovered by the mouse cursor, when the text cursor is
      // within a link, to avoid any potential clashes in positioning.
      setMouseHoverLink(undefined);
    }
  }, [frozen, selectionLink]);

  // The `mouseHoverLink` state is completely separate from the `open` state as
  // the FloatingUI `useHover` hook handles opening/closing the popover when a
  // link is hovered with the mouse cursor. Therefore, we only need to update
  // the link when a new one is hovered.
  const [mouseHoverLink, setMouseHoverLink] = useState<
    | { url: string; text: string; range: Range; element: HTMLAnchorElement }
    | undefined
  >(undefined);
  useEffect(() => {
    const cb = (event: MouseEvent) => {
      // Ignores the link hovered by the mouse cursor, when the text cursor is
      // within a link, to avoid any potential clashes in positioning.
      if (selectionLink) {
        return;
      }

      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const link = linkToolbar.getLinkAtElement(event.target);
      if (!link) {
        return;
      }

      setMouseHoverLink({
        url: link.mark.attrs.href as string,
        text: link.text,
        range: link.range,
        element: linkToolbar.getLinkElementAtPos(link.range.from)!,
      });
    };

    document.body.addEventListener("mouseover", cb);

    return () => {
      document.body.removeEventListener("mouseover", cb);
    };
  }, [frozen, linkToolbar, mouseHoverLink?.url, selectionLink]);

  const link = useMemo(
    () => selectionLink || mouseHoverLink,
    [mouseHoverLink, selectionLink],
  );

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open,
        onOpenChange: (open, _event, reason) => {
          if (frozen) {
            return;
          }
          // We want to prioritize `selectionLink` over `mouseHoverLink`, so we
          // ignore opening/closing from hover events.
          if (selectionLink && reason === "hover") {
            return;
          }

          setOpen(open);
        },
        placement: "top-start",
        middleware: [offset(10), flip()],
      },
      useHoverProps: {
        // `useHover` hook only enabled when a link is hovered with the
        // mouse.
        enabled: !selectionLink && !!mouseHoverLink,
        delay: {
          // TODO: Figure out good values
          open: 250,
          close: 250,
        },
        // restMs: 300,
        handleClose: safePolygon(),
      },
      elementProps: {
        style: {
          zIndex: 50,
        },
      },
      ...props.floatingUIOptions,
    }),
    [frozen, mouseHoverLink, open, props.floatingUIOptions, selectionLink],
  );

  // When a link is deleted, the element representing it in the DOM gets
  // unmounted. However, the reference still exists and so FloatingUI can still
  // call `getBoundingClientRect` on it, which will return a `DOMRect` that has
  // an x, y, height, and width of 0. This is why we instead use a virtual
  // element for the reference, and use the last obtained `DOMRect` from when
  // the link element was still mounted to the DOM.
  const mountedBoundingClientRect = useRef(new DOMRect());
  if (link?.element && editor.prosemirrorView.root.contains(link.element)) {
    mountedBoundingClientRect.current = link.element.getBoundingClientRect();
  }

  const Component = props.linkToolbar || LinkToolbar;

  return (
    <GenericPopover
      reference={{
        getBoundingClientRect: () => mountedBoundingClientRect.current,
        contextElement: link?.element,
      }}
      {...floatingUIOptions}
    >
      {link && (
        <Component
          url={link.url}
          text={link.text}
          range={link.range}
          setToolbarFrozen={setFrozen}
          setToolbarOpen={setOpen}
        />
      )}
    </GenericPopover>
  );
};
