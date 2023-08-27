import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
} from "@blocknote/core";
import Tippy, { tippy } from "@tippyjs/react";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { sticky } from "tippy.js";

import { DefaultFormattingToolbar } from "./DefaultFormattingToolbar";
import { useEditorContentChange } from "../../hooks/useEditorContentChange";
import { useEditorSelectionChange } from "../../hooks/useEditorSelectionChange";

export type FormattingToolbarProps<
  BSchema extends BlockSchema = DefaultBlockSchema
> = {
  editor: BlockNoteEditor<BSchema>;
};

export const FormattingToolbarPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema
>(props: {
  editor: BlockNoteEditor<BSchema>;
  formattingToolbar?: FC<FormattingToolbarProps<BSchema>>;
}) => {
  // Placement is dynamic based on the text alignment of the current block.
  const getPlacement = useMemo(
    () => () => {
      const block = props.editor.getTextCursorPosition().block;

      if (!("textAlignment" in block.props)) {
        return "top-start";
      }

      switch (block.props.textAlignment) {
        case "left":
          return "top-start";
        case "center":
          return "top";
        case "right":
          return "top-end";
        default:
          return "top-start";
      }
    },
    [props.editor]
  );

  const [show, setShow] = useState<boolean>(false);
  const [placement, setPlacement] = useState<"top-start" | "top" | "top-end">(
    getPlacement
  );

  const referencePos = useRef<DOMRect>();

  useEffect(() => {
    tippy.setDefaultProps({ maxWidth: "" });

    return props.editor.formattingToolbar.onUpdate((state) => {
      setShow(state.show);

      referencePos.current = state.referencePos;
    });
  }, [props.editor]);

  useEditorContentChange(props.editor, () => setPlacement(getPlacement()));
  useEditorSelectionChange(props.editor, () => setPlacement(getPlacement()));

  const getReferenceClientRect = useMemo(
    () => {
      console.log("getReferenceClientRect");
      if (!referencePos) {
        return undefined;
      }
      return () => referencePos.current!;
    },
    [referencePos.current] // eslint-disable-line
  );

  const formattingToolbarElement = useMemo(() => {
    const FormattingToolbar =
      props.formattingToolbar || DefaultFormattingToolbar;

    return <FormattingToolbar editor={props.editor} />;
  }, [props.editor, props.formattingToolbar]);

  return (
    <Tippy
      appendTo={props.editor.domElement.parentElement!}
      content={formattingToolbarElement}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={"fade"}
      placement={placement}
      sticky={true}
      plugins={tippyPlugins}
    />
  );
};

// We want Tippy to call `getReferenceClientRect` whenever the reference
// DOMRect's position changes. This happens automatically on scroll, but we need
// the `sticky` plugin to make it happen in all cases. This is most evident
// when changing the text alignment using the formatting toolbar.
const tippyPlugins = [sticky];
