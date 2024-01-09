import {
  BaseUiElementState,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  ImageToolbarState,
  InlineContentSchema,
  SpecificBlock,
} from "@blocknote/core";
import {
  flip,
  offset,
  useFloating,
  useTransitionStyles,
} from "@floating-ui/react";
import { FC, useEffect, useRef, useState } from "react";

import { DefaultImageToolbar } from "./DefaultImageToolbar";

export type ImageToolbarProps<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema
> = Omit<ImageToolbarState<BSchema, I>, keyof BaseUiElementState> & {
  editor: BlockNoteEditor<BSchema, I>;
};

export const ImageToolbarPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, any>;
  imageToolbar?: FC<ImageToolbarProps<BSchema, I>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [block, setBlock] = useState<SpecificBlock<BSchema, "image", I, any>>();

  const referencePos = useRef<DOMRect>();

  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement: "bottom",
    middleware: [offset(10), flip()],
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    return props.editor.imageToolbar.onUpdate((imageToolbarState) => {
      setShow(imageToolbarState.show);
      setBlock(imageToolbarState.block);

      referencePos.current = imageToolbarState.referencePos;

      update();
    });
  }, [props.editor, update]);

  useEffect(() => {
    refs.setReference({
      getBoundingClientRect: () => referencePos.current!,
    });
  }, [refs]);

  const ImageToolbar = props.imageToolbar || DefaultImageToolbar;

  if (!isMounted) {
    return null;
  }

  return (
    <div
      ref={refs.setFloating}
      style={{ ...styles, ...floatingStyles, zIndex: 5000 }}>
      <ImageToolbar editor={props.editor} block={block!} />
    </div>
  );
};
