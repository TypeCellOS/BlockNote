import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
} from "@blocknote/core";
import Tippy from "@tippyjs/react";
import { FC, useEffect, useMemo, useRef, useState } from "react";
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

  useEffect(() => {
    return props.editor.formattingToolbar.onUpdate((state) => {
      setShow(state.show);

      referencePos.current = state.referencePos;
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
      placement={"top-start"}
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
