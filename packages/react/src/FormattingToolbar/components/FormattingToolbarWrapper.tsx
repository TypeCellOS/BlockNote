import { FC, useEffect, useMemo, useRef, useState } from "react";
import Tippy from "@tippyjs/react";
import { sticky } from "tippy.js";
import {
  BlockNoteEditor,
  BlockSchema,
  createFormattingToolbar,
  FormattingToolbarCallbacks,
} from "@blocknote/core";

import { DefaultFormattingToolbar } from "./DefaultFormattingToolbar";

export type FormattingToolbarProps<BSchema extends BlockSchema> = {
  editor: BlockNoteEditor<BSchema>;
};
export const FormattingToolbarWrapper = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  formattingToolbar?: FC<FormattingToolbarProps<BSchema>>;
}) => {
  const [show, setShow] = useState<boolean>(false);

  const referencePos = useRef<DOMRect>();
  const callbacks = useRef<FormattingToolbarCallbacks>();

  useEffect(() => {
    callbacks.current = createFormattingToolbar(props.editor, (state) => {
      setShow(state.show);

      referencePos.current = state.referencePos;
    });

    return callbacks.current.destroy;
  }, [props.editor]);

  const getReferenceClientRect = useMemo(() => {
    if (!referencePos) {
      return undefined;
    }
    return () => referencePos.current!;
  }, [referencePos.current]);

  const formattingToolbarElement = useMemo(() => {
    const FormattingToolbar =
      props.formattingToolbar || DefaultFormattingToolbar;

    return <FormattingToolbar editor={props.editor} />;
  }, [props.editor, props.formattingToolbar]);

  return (
    <Tippy
      content={formattingToolbarElement}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={"fade"}
      placement={"top-start"}
      sticky={true}
      plugins={[sticky]}>
      <div />
    </Tippy>
  );
};
