import {
  BlockNoteEditor,
  BlockSchema,
  createFormattingToolbar,
  FormattingToolbarCallbacks,
} from "@blocknote/core";

import Tippy from "@tippyjs/react";
import { sticky } from "tippy.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { ColorStyleButton } from "./DefaultButtons/ColorStyleButton";
import { CreateLinkButton } from "./DefaultButtons/CreateLinkButton";
import {
  NestBlockButton,
  UnnestBlockButton,
} from "./DefaultButtons/NestBlockButtons";
import { TextAlignButton } from "./DefaultButtons/TextAlignButton";
import { ToggledStyleButton } from "./DefaultButtons/ToggledStyleButton";
import { BlockTypeDropdown } from "./DefaultDropdowns/BlockTypeDropdown";

export const FormattingToolbarOld = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  return (
    <Toolbar>
      <BlockTypeDropdown {...props} />

      <ToggledStyleButton editor={props.editor} toggledStyle={"bold"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"italic"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"underline"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"strike"} />

      <TextAlignButton editor={props.editor as any} textAlignment={"left"} />
      <TextAlignButton editor={props.editor as any} textAlignment={"center"} />
      <TextAlignButton editor={props.editor as any} textAlignment={"right"} />

      <ColorStyleButton editor={props.editor} />

      <NestBlockButton editor={props.editor} />
      <UnnestBlockButton editor={props.editor} />

      <CreateLinkButton editor={props.editor} />
    </Toolbar>
  );
};

export const FormattingToolbar = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
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

  const formattingToolbar = useMemo(() => {
    return <FormattingToolbarOld editor={props.editor} />;
  }, [props.editor]);

  return (
    <Tippy
      content={formattingToolbar}
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
