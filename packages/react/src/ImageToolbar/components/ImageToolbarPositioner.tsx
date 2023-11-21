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
import Tippy, { tippy } from "@tippyjs/react";
import { FC, useEffect, useMemo, useRef, useState } from "react";

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

  useEffect(() => {
    tippy.setDefaultProps({ maxWidth: "" });

    return props.editor.imageToolbar.onUpdate((imageToolbarState) => {
      setShow(imageToolbarState.show);
      setBlock(imageToolbarState.block);

      referencePos.current = imageToolbarState.referencePos;
    });
  }, [props.editor]);

  const getReferenceClientRect = useMemo(
    () => {
      if (!referencePos) {
        return undefined;
      }
      return () => referencePos.current!;
    },
    [referencePos.current] // eslint-disable-line
  );

  const imageToolbarElement = useMemo(() => {
    const ImageToolbar = props.imageToolbar || DefaultImageToolbar;

    return <ImageToolbar editor={props.editor} block={block!} />;
  }, [block, props.editor, props.imageToolbar]);

  return (
    <Tippy
      appendTo={props.editor.domElement.parentElement!}
      content={imageToolbarElement}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={"fade"}
      placement={"bottom"}
      zIndex={5000}
    />
  );
};
