import {
  BlockSchema,
  InlineContentSchema,
  LinkToolbar as LinkToolbarExtension,
  StyleSchema,
} from "@blocknote/core";
import { flip, offset, safePolygon } from "@floating-ui/react";
import { Range } from "@tiptap/core";
import { FC, useEffect, useMemo, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { LinkToolbar } from "./LinkToolbar.js";
import { LinkToolbarProps } from "./LinkToolbarProps.js";
import { useEditorState } from "../../hooks/useEditorState.js";
import { usePlugin } from "../../hooks/usePlugin.js";
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

  const linkToolbar = usePlugin(LinkToolbarExtension);
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
    setOpen(!!selectionLink);
    if (selectionLink) {
      // Clears the link hovered by the mouse cursor, when the text cursor is
      // within a link, to avoid any potential clashes in positioning.
      setMouseHoverLink(undefined);
    }
  }, [selectionLink]);

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
  }, [linkToolbar, mouseHoverLink?.url, selectionLink]);

  const link = useMemo(
    () => selectionLink || mouseHoverLink,
    [mouseHoverLink, selectionLink],
  );

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open,
        onOpenChange: (open, _event, reason) => {
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
    [mouseHoverLink, open, props.floatingUIOptions, selectionLink],
  );

  const Component = props.linkToolbar || LinkToolbar;

  return (
    <GenericPopover reference={link?.element} {...floatingUIOptions}>
      {link && <Component url={link.url} text={link.text} range={link.range} />}
    </GenericPopover>
  );
};
