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
import { sticky } from "tippy.js";

import { DefaultImageToolbar } from "./DefaultImageToolbar";
import { useEditorChange } from "../../hooks/useEditorChange";

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
  const [placement, setPlacement] = useState<"top-start" | "top" | "top-end">(
    getPlacement
  );

  const referencePos = useRef<DOMRect>();

  useEffect(() => {
    tippy.setDefaultProps({ maxWidth: "" });

    return props.editor.imageToolbar.onUpdate((imageToolbarState) => {
      setShow(imageToolbarState.show);
      setBlock(imageToolbarState.block);

      referencePos.current = imageToolbarState.referencePos;
    });
  }, [props.editor]);

  useEditorChange(props.editor, () => setPlacement(getPlacement()));

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
      placement={placement}
      sticky={true}
      plugins={tippyPlugins}
      zIndex={5000}
    />
  );
};

// We want Tippy to call `getReferenceClientRect` whenever the reference
// DOMRect's position changes. This happens automatically on scroll, but we need
// the `sticky` plugin to make it happen in all cases. This is most evident
// when changing the text alignment using the image toolbar.
const tippyPlugins = [sticky];
