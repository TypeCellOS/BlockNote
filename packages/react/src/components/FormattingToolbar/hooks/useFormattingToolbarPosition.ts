import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultProps,
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
import { useEditorChange } from "../../../hooks/useEditorChange";
import { UiComponentPosition } from "../../../components-shared/UiComponentTypes";

const textAlignmentToPlacement = (
  textAlignment: DefaultProps["textAlignment"]
) => {
  switch (textAlignment) {
    case "left":
      return "top-start";
    case "center":
      return "top";
    case "right":
      return "top-end";
    default:
      return "top-start";
  }
};

export function useFormattingToolbarPosition<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): UiComponentPosition {
  const [show, setShow] = useState<boolean>(false);
  const referencePos = useRef<DOMRect>();
  const [placement, setPlacement] = useState<"top-start" | "top" | "top-end">(
    () => {
      const block = editor.getTextCursorPosition().block;

      if (!("textAlignment" in block.props)) {
        return "top-start";
      }

      return textAlignmentToPlacement(
        block.props.textAlignment as DefaultProps["textAlignment"]
      );
    }
  );

  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement,
    middleware: [offset(10), flip()],
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    return editor.formattingToolbar.onPositionUpdate((position) => {
      setShow(position.show);

      referencePos.current = position.referencePos;

      update();
    });
  }, [editor, update]);

  useEditorChange(editor, () => {
    const block = editor.getTextCursorPosition().block;

    if (!("textAlignment" in block.props)) {
      setPlacement("top-start");
    } else {
      setPlacement(
        textAlignmentToPlacement(
          block.props.textAlignment as DefaultProps["textAlignment"]
        )
      );
    }
  });

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
      zIndex: 3000,
    },
  };
}
