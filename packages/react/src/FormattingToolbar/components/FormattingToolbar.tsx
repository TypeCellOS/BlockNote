import {
  BlockNoteEditor,
  BlockSchema,
  FormattingToolbarState,
  createFormattingToolbar,
} from "@blocknote/core";

import Tippy from "@tippyjs/react";
import { useEffect, useMemo, useState } from "react";
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
  const [state, setState] = useState<FormattingToolbarState>();
  useEffect(() => {
    return createFormattingToolbar(props.editor, (state) => {
      setState({ ...state });
    });
  }, [props.editor]);

  const getReferenceClientRect = useMemo(() => {
    // TODO: test
    console.log(
      "new reference pos TOOLBAR, this should only be triggered when selection changes"
    );
    if (!state?.referencePos) {
      return undefined;
    }
    return () => state.referencePos;
  }, [state?.referencePos]);

  return (
    <Tippy
      content={<FormattingToolbarOld editor={props.editor} />}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={state?.show || false}
      animation={"fade"}
      placement={"top-start"}>
      <div />
    </Tippy>
  );
};
