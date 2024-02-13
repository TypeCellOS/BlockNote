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
  flip,
  offset,
  useFloating,
  useTransitionStyles,
} from "@floating-ui/react";
import { useEffect, useRef, useState } from "react";
import { UiComponentPosition } from "../../../components-shared/UiComponentTypes";

export function useImageToolbarPosition<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): UiComponentPosition {
  const [show, setShow] = useState<boolean>(false);
  const referencePos = useRef<DOMRect>();

  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement: "bottom",
    middleware: [offset(10), flip()],
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    return editor.imageToolbar.onPositionUpdate((position) => {
      setShow(position.show);
      referencePos.current = position.referencePos;
      update();
    });
  }, [editor.imageToolbar, update]);

  useEffect(() => {
    refs.setReference({
      getBoundingClientRect: () => referencePos.current!,
    });
  }, [refs]);

  return {
    isMounted: isMounted,
    ref: refs.setFloating,
    style: {
      display: "flex",
      ...styles,
      ...floatingStyles,
      zIndex: 5000,
    },
  };
}
