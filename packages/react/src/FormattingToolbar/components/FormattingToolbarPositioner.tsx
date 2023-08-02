import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
} from "@blocknote/core";
import { flip, useFloating, useTransitionStyles } from "@floating-ui/react";
import { FC, useEffect, useRef, useState } from "react";
import { sticky } from "tippy.js";
import { DefaultFormattingToolbar } from "./DefaultFormattingToolbar";

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
  const [show, setShow] = useState<boolean>(false);

  const referencePos = useRef<DOMRect>();

  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement: "top-start",
    middleware: [flip()],
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    return props.editor.formattingToolbar.onUpdate((state) => {
      setShow(state.show);
      referencePos.current = state.referencePos;
      update();
    });
  }, [props.editor, update]);

  const FormattingToolbar = props.formattingToolbar || DefaultFormattingToolbar;

  useEffect(() => {
    refs.setReference({
      getBoundingClientRect: () => {
        console.log(referencePos.current);
        return referencePos.current!;
      },
    });
  }, [refs]);

  if (!isMounted) {
    return null;
  }
  console.log(styles);
  return (
    <div
      ref={refs.setFloating}
      style={{ ...styles, ...floatingStyles, zIndex: 10000 }}>
      <FormattingToolbar editor={props.editor} />
    </div>
  );
  // return (
  //   <Tippy
  //     appendTo={props.editor.domElement.parentElement!}
  //     content={formattingToolbarElement}
  //     getReferenceClientRect={getReferenceClientRect}
  //     interactive={true}
  //     visible={show}
  //     animation={"fade"}
  //     placement={"top-start"}
  //     sticky={true}
  //     plugins={tippyPlugins}
  //   />
  // );
};

// We want Tippy to call `getReferenceClientRect` whenever the reference
// DOMRect's position changes. This happens automatically on scroll, but we need
// the `sticky` plugin to make it happen in all cases. This is most evident
// when changing the text alignment using the formatting toolbar.
const tippyPlugins = [sticky];
