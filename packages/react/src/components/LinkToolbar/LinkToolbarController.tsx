import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
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
import { getMarkRange, posToDOMRect } from "@tiptap/core";
import { isEventTargetWithin } from "@floating-ui/react/utils";
import { useEditorState } from "../../hooks/useEditorState.js";
import { useElementHover } from "../../hooks/useElementHover.js";

function getLinkElementAtPos(
  editor: BlockNoteEditor<any, any, any>,
  pos: number,
) {
  let currentNode = editor.prosemirrorView.nodeDOM(pos);
  while (currentNode && currentNode.parentElement) {
    if (currentNode.nodeName === "A") {
      return currentNode as HTMLAnchorElement;
    }
    currentNode = currentNode.parentElement;
  }
  return null;
}

function getLinkAtElement(
  editor: BlockNoteEditor<any, any, any>,
  element: HTMLElement,
) {
  return editor.transact(() => {
    const posAtElement = editor.prosemirrorView.posAtDOM(element, 0) + 1;
    return getMarkAtPos(editor, posAtElement, "link");
  });
}

function getLinkAtSelection(editor: BlockNoteEditor<any, any, any>) {
  return editor.transact((tr) => {
    const selection = tr.selection;
    return getMarkAtPos(editor, selection.anchor, "link");
  });
}

function getMarkAtPos(
  editor: BlockNoteEditor<any, any, any>,
  pos: number,
  markType: string,
) {
  return editor.transact((tr) => {
    const resolvedPos = tr.doc.resolve(pos);
    const mark = resolvedPos
      .marks()
      .find((mark) => mark.type.name === markType);

    if (!mark) {
      return;
    }

    const markRange = getMarkRange(resolvedPos, mark.type);
    if (!markRange) {
      return;
    }

    return {
      range: markRange,
      mark,
      get text() {
        return tr.doc.textBetween(markRange.from, markRange.to);
      },
      get position() {
        // to minimize re-renders, we convert to JSON, which is the same shape anyway
        return posToDOMRect(
          editor.prosemirrorView,
          markRange.from,
          markRange.to,
        ).toJSON() as DOMRect;
      },
    };
  });
}

function isWithinEditor(
  editor: BlockNoteEditor,
  element: HTMLElement | EventTarget,
) {
  const editorWrapper = editor.prosemirrorView.dom.parentElement;
  if (!editorWrapper) {
    return false;
  }

  return (
    editorWrapper === (element as Node) ||
    editorWrapper.contains(element as Node)
  );
}

export const LinkToolbarController = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  linkToolbar?: FC<LinkToolbarProps>;
  floatingOptions?: Partial<UseFloatingOptions>;
}) => {
  const editor = useBlockNoteEditor<BSchema, I, S>();
  const linkAtSelection = useEditorState({
    editor,
    selector: ({ editor }) => {
      return getLinkAtSelection(editor);
    },
  });

  const callbacks = {
    deleteLink: editor.linkToolbar.deleteLink,
    editLink: editor.linkToolbar.editLink,
    startHideTimer: editor.linkToolbar.startHideTimer,
    stopHideTimer: editor.linkToolbar.stopHideTimer,
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
      if (getLinkAtSelection(editor)) {
        return null; // Disable hover when link is selected
      }

      // Check for link at the hovered element
      const linkAtElement = getLinkAtElement(editor, target as HTMLElement);
      if (linkAtElement) {
        return getLinkElementAtPos(editor, linkAtElement.range.from);
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

    setReference(getLinkElementAtPos(editor, linkAtSelection.range.from));
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
        startHideTimer={callbacks.startHideTimer}
        stopHideTimer={callbacks.stopHideTimer}
      />
    </div>
  );
};
