import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultProps,
} from "@blocknote/core";
import { flip, useFloating, useTransitionStyles } from "@floating-ui/react";
import { FC, useEffect, useRef, useState } from "react";
import { sticky } from "tippy.js";
import { useEditorChange } from "../../hooks/useEditorChange";
import { DefaultFormattingToolbar } from "./DefaultFormattingToolbar";

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

export type FormattingToolbarProps<
  BSchema extends BlockSchema = DefaultBlockSchema
> = {
  editor: BlockNoteEditor<BSchema, any, any>;
};

export const FormattingToolbarPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema
>(props: {
  editor: BlockNoteEditor<BSchema, any, any>;
  formattingToolbar?: FC<FormattingToolbarProps<BSchema>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [placement, setPlacement] = useState<"top-start" | "top" | "top-end">(
    () => {
      const block = props.editor.getTextCursorPosition().block;

      if (!("textAlignment" in block.props)) {
        return "top-start";
      }

      return textAlignmentToPlacement(
        block.props.textAlignment as DefaultProps["textAlignment"]
      );
    }
  );

  const referencePos = useRef<DOMRect>();

  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement,
    middleware: [flip()],
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    // tippy.setDefaultProps({ maxWidth: "" });

    return props.editor.formattingToolbar.onUpdate((state) => {
      setShow(state.show);
      referencePos.current = state.referencePos;
      update();
    });
  }, [props.editor, update]);

  useEditorChange(props.editor, () => {
    const block = props.editor.getTextCursorPosition().block;

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

  const FormattingToolbar = props.formattingToolbar || DefaultFormattingToolbar;

  if (!isMounted) {
    return null;
  }

  return (
    <div
      ref={refs.setFloating}
      style={{ ...styles, ...floatingStyles, zIndex: 10000 }}>
      <FormattingToolbar editor={props.editor} />
    </div>
  );
};

// We want Tippy to call `getReferenceClientRect` whenever the reference
// DOMRect's position changes. This happens automatically on scroll, but we need
// the `sticky` plugin to make it happen in all cases. This is most evident
// when changing the text alignment using the formatting toolbar.
const tippyPlugins = [sticky];
