import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  LinkToolbarPlugin,
  StyleSchema,
} from "@blocknote/core";
import {
  UseFloatingOptions,
  autoUpdate,
  flip,
  offset,
  useDismiss,
  useFloating,
  useInteractions,
  useTransitionStyles,
} from "@floating-ui/react";
import { FC, useEffect, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { LinkToolbar } from "./LinkToolbar.js";
import { LinkToolbarProps } from "./LinkToolbarProps.js";
import { isEventTargetWithin } from "@floating-ui/react/utils";
import { useEditorState } from "../../hooks/useEditorState.js";
import { useElementHover } from "../../hooks/useElementHover.js";
import { usePlugin } from "../../hooks/usePlugin.js";

export const LinkToolbarController = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  linkToolbar?: FC<LinkToolbarProps>;
  floatingOptions?: Partial<UseFloatingOptions>;
}) => {
  const editor = useBlockNoteEditor<BSchema, I, S>();

  const linkToolbar = usePlugin(LinkToolbarPlugin);
  const linkAtSelection = useEditorState({
    editor,
    selector: () => {
      return linkToolbar.getLinkAtSelection();
    },
  });

  const callbacks = {
    deleteLink: linkToolbar.deleteLink,
    editLink: linkToolbar.editLink,
  };
  const [show, setShow] = useState(false);

  const {
    refs: { setFloating: ref, setReference },
    context,
    floatingStyles,
  } = useFloating({
    open: show,
    placement: "top-start",
    middleware: [offset(10), flip()],
    onOpenChange: setShow,
    whileElementsMounted: autoUpdate,
    ...props.floatingOptions,
  });

  const { isMounted, styles } = useTransitionStyles(context);

  // handle "escape" and other dismiss events, these will add some listeners to
  // getFloatingProps which need to be attached to the floating element
  const dismiss = useDismiss(context, {
    outsidePress: (e) =>
      !isEventTargetWithin(e, editor.prosemirrorView.dom.parentElement),
  });

  // Create element hover hook for link detection
  const elementHover = useElementHover(context, {
    enabled: !linkAtSelection,
    attachTo() {
      return editor.prosemirrorView.dom;
    },
    delay: { open: 250, close: 400 },
    restMs: 300,
    getElementAtHover: (target) => {
      // Check if there's a link at the current selection first
      if (editor.getExtension(LinkToolbarPlugin)?.getLinkAtSelection()) {
        return null; // Disable hover when link is selected
      }

      // Check for link at the hovered element
      const linkAtElement = editor
        .getExtension(LinkToolbarPlugin)
        ?.getLinkAtElement(target as HTMLElement);
      if (linkAtElement) {
        return editor
          .getExtension(LinkToolbarPlugin)
          ?.getLinkElementAtPos(linkAtElement.range.from);
      }

      return null;
    },
    onHover: (element) => {
      if (element) {
        setReference(element);
        setShow(true);
      } else {
        setReference(null);
        setShow(false);
      }
    },
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    dismiss,
    elementHover,
  ]);

  useEffect(() => {
    const abortController = new AbortController();
    const props = getReferenceProps();

    for (const [key, eventListener] of Object.entries(props)) {
      if (typeof eventListener === "function" && key.startsWith("on")) {
        editor.prosemirrorView.dom.addEventListener(
          // e.g. "onKeyDown" -> "keydown"
          key.slice(2).toLowerCase() as keyof HTMLElementEventMap,
          eventListener as (e: Event) => void,
          {
            signal: abortController.signal,
          },
        );
      }
    }

    return () => {
      abortController.abort();
    };
  }, [editor, getReferenceProps]);

  useEffect(() => {
    if (!linkAtSelection) {
      setReference(null);
      setShow(false);
      return;
    }

    setReference(
      editor
        .getExtension(LinkToolbarPlugin)
        ?.getLinkElementAtPos(linkAtSelection.range.from) || null,
    );
    setShow(true);
  }, [editor, linkAtSelection, setReference]);
  const style = {
    display: "flex",
    ...styles,
    ...floatingStyles,
    zIndex: 4000,
  };
  // const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
  //   state?.show || false,
  //   state?.referencePos || null,
  //   4000,
  //   // {
  //   //   placement: "top-start",
  //   //   middleware: [offset(10), flip()],
  //   //   onOpenChange: (open) => {
  //   //     if (!open) {
  //   //       editor.linkToolbar.closeMenu();
  //   //       editor.focus();
  //   //     }
  //   //   },
  //   //   ...props.floatingOptions,
  //   // },
  // );
  // console.log(show, linkAtSelection);
  if (!isMounted) {
    return null;
  }

  const Component = props.linkToolbar || LinkToolbar;

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <Component
        url={String(linkAtSelection?.mark.attrs.href || "")}
        text={linkAtSelection?.text || ""}
        deleteLink={callbacks.deleteLink}
        editLink={callbacks.editLink}
        startHideTimer={() => {
          // todo remove timer
        }}
        stopHideTimer={() => {
          // todo remove timer
        }}
      />
    </div>
  );
};
