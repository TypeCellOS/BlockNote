import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { LinkToolbarExtension } from "@blocknote/core/extensions";
import { flip, offset, safePolygon } from "@floating-ui/react";
import { Range } from "@tiptap/core";
import { FC, useEffect, useMemo, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { LinkToolbar } from "./LinkToolbar.js";
import { LinkToolbarProps } from "./LinkToolbarProps.js";
import { useEditorState } from "../../hooks/useEditorState.js";
import { useExtension } from "../../hooks/useExtension.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import {
  GenericPopover,
  GenericPopoverReference,
} from "../Popovers/GenericPopover.js";

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

  const link = selectionLink || mouseHoverLink;

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

          if (reason === "escape-key") {
            editor.focus();
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
          open: 250,
          close: 250,
        },
        handleClose: safePolygon(),
      },
      elementProps: {
        style: {
          zIndex: 50,
        },
      },
      ...props.floatingUIOptions,
    }),
    [
      editor,
      frozen,
      mouseHoverLink,
      open,
      props.floatingUIOptions,
      selectionLink,
    ],
  );

  const reference = useMemo<GenericPopoverReference | undefined>(
    () => (link?.element ? { element: link.element } : undefined),
    [link?.element],
  );

  if (!editor.isEditable) {
    return null;
  }

  const Component = props.linkToolbar || LinkToolbar;

  return (
    <GenericPopover reference={reference} {...floatingUIOptions}>
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
