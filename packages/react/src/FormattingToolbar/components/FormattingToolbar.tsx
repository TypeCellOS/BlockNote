import {
  BlockNoteEditor,
  BlockSchema,
  createFormattingToolbar,
  FormattingToolbarState,
} from "@blocknote/core";

import { useCallback, useEffect, useRef, useState } from "react";
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
import Tippy from "@tippyjs/react";

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
  const [state, setState] = useState<
    Omit<FormattingToolbarState, "referencePos"> | undefined
  >();
  // Since we're using Tippy, we don't want to trigger re-renders when only the
  // reference position changes. So we store it in a ref instead of state.
  const referenceClientRect = useRef<DOMRect | undefined>();

  useEffect(() => {
    createFormattingToolbar(props.editor, ({ referencePos, ...state }) => {
      setState(state);
      referenceClientRect.current = referencePos;
    });
  }, [props.editor]);

  const getReferenceClientRect = useCallback(
    () => referenceClientRect.current!,
    [referenceClientRect]
  );

  return (
    <Tippy
      appendTo={props.editor._tiptapEditor.view.dom.parentElement!}
      content={<FormattingToolbarOld editor={props.editor} />}
      getReferenceClientRect={
        referenceClientRect.current && getReferenceClientRect
      }
      interactive={true}
      visible={state?.show || false}
      animation={"fade"}
      placement={"top-start"}
    />
  );
};
