import {
  BaseUiElementState,
  BlockNoteEditor,
  BlockSchema,
  BlockSpec,
  DefaultBlockSchema,
  ImageToolbarState,
  SpecificBlock,
} from "@blocknote/core";
import Tippy, { tippy } from "@tippyjs/react";
import { FC, useEffect, useMemo, useRef, useState } from "react";

import { DefaultImageToolbar } from "./DefaultImageToolbar";

export type ImageToolbarProps<
  BSchema extends BlockSchema = DefaultBlockSchema
> = Omit<ImageToolbarState, keyof BaseUiElementState> & {
  editor: BlockNoteEditor<BSchema>;
};

export const ImageToolbarPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema
>(props: {
  editor: BlockNoteEditor<BSchema>;
  imageToolbar?: FC<ImageToolbarProps<BSchema>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [block, setBlock] = useState<
    SpecificBlock<
      BlockSchema & {
        image: BlockSpec<
          "image",
          {
            src: { default: string };
          },
          false
        >;
      },
      "image"
    >
  >();

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
