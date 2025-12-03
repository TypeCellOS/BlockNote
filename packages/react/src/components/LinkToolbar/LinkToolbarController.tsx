import { LinkToolbarExtension } from "@blocknote/core/extensions";
import { flip, offset, safePolygon } from "@floating-ui/react";
import { Range } from "@tiptap/core";
import { FC, useEffect, useMemo, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { LinkToolbar } from "./LinkToolbar.js";
import { LinkToolbarProps } from "./LinkToolbarProps.js";
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
  const editor = useBlockNoteEditor<any, any, any>();

  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [toolbarPositionFrozen, setToolbarPositionFrozen] = useState(false);

  const linkToolbar = useExtension(LinkToolbarExtension);

  // Because the toolbar opens with a delay when a link is hovered by the mouse
  // cursor, We need separate `toolbarOpen` and `link` states.
  const [link, setLink] = useState<
    | {
        cursorType: "text" | "mouse";
        url: string;
        text: string;
        range: Range;
        element: HTMLAnchorElement;
      }
    | undefined
  >(undefined);
  // Updates the link to show the toolbar for. Uses the link found at the text
  // cursor position. If there is none, uses the link hovered by the mouse
  // cursor. Otherwise, the toolbar remains closed.
  useEffect(() => {
    const textCursorCallback = () => {
      const textCursorLink = linkToolbar.getLinkAtSelection();
      if (!textCursorLink) {
        setLink(undefined);

        if (!toolbarPositionFrozen) {
          setToolbarOpen(false);
        }

        return;
      }

      setLink({
        cursorType: "text",
        url: textCursorLink.mark.attrs.href as string,
        text: textCursorLink.text,
        range: textCursorLink.range,
        element: linkToolbar.getLinkElementAtPos(textCursorLink.range.from)!,
      });

      if (!toolbarPositionFrozen) {
        setToolbarOpen(true);
      }
    };

    // At no point in this callback is `setToolbarOpen` called, even though
    // hovering a link with the mouse cursor should open the toolbar. This is
    // because the FloatingUI `useHover` hook basically does this for us, so we
    // only need to update `link` when a new one is hovered.
    const mouseCursorCallback = (event: MouseEvent) => {
      // Links selected by the text cursor take priority over those hovered by
      // the mouse cursor.
      if (link !== undefined && link.cursorType === "text") {
        return;
      }

      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const mouseCursorLink = linkToolbar.getLinkAtElement(event.target);
      if (!mouseCursorLink) {
        return;
      }

      setLink({
        cursorType: "mouse",
        url: mouseCursorLink.mark.attrs.href as string,
        text: mouseCursorLink.text,
        range: mouseCursorLink.range,
        element: linkToolbar.getLinkElementAtPos(mouseCursorLink.range.from)!,
      });
    };

    const destroyOnChangeHandler = editor.onChange(textCursorCallback);
    const destroyOnSelectionChangeHandler =
      editor.onSelectionChange(textCursorCallback);

    editor.domElement?.addEventListener("mouseover", mouseCursorCallback);

    return () => {
      destroyOnChangeHandler();
      destroyOnSelectionChangeHandler();

      editor.domElement?.removeEventListener("mouseover", mouseCursorCallback);
    };
  }, [editor, linkToolbar, link, toolbarPositionFrozen]);

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open: toolbarOpen,
        onOpenChange: (open, _event, reason) => {
          if (toolbarPositionFrozen) {
            return;
          }

          // We want to prioritize `selectionLink` over `mouseHoverLink`, so we
          // ignore opening/closing from hover events.
          if (
            link !== undefined &&
            link.cursorType === "text" &&
            reason === "hover"
          ) {
            return;
          }

          if (reason === "escape-key") {
            editor.focus();
          }

          setToolbarOpen(open);
        },
        placement: "top-start",
        middleware: [offset(10), flip()],
      },
      useHoverProps: {
        // `useHover` hook only enabled when a link is hovered with the
        // mouse.
        enabled: link !== undefined && link.cursorType === "mouse",
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
    [editor, link, props.floatingUIOptions, toolbarOpen, toolbarPositionFrozen],
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
          setToolbarOpen={setToolbarOpen}
          setToolbarPositionFrozen={setToolbarPositionFrozen}
        />
      )}
    </GenericPopover>
  );
};
