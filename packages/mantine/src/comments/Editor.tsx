import { assertEmpty } from "@blocknote/core";
import {
  ComponentProps,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  useBlockNoteContext,
} from "@blocknote/react";
import { forwardRef } from "react";
import { BlockNoteView } from "../BlockNoteView.js";

export const Editor = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Editor"]
>((props, ref) => {
  const { className, autoFocus, onFocus, onBlur, editor, editable, ...rest } =
    props;

  assertEmpty(rest, false);

  const blockNoteContext = useBlockNoteContext();

  return (
    <BlockNoteView
      autoFocus={autoFocus}
      className={className}
      editor={props.editor}
      sideMenu={false}
      slashMenu={false}
      tableHandles={false}
      filePanel={false}
      formattingToolbar={false}
      editable={editable}
      theme={blockNoteContext?.colorSchemePreference}
      ref={ref}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <FormattingToolbarController
        formattingToolbar={CustomFormattingToolbar}
      />
    </BlockNoteView>
  );
});

const CustomFormattingToolbar = () => {
  const items = getFormattingToolbarItems([]).filter(
    (el) => el.key !== "nestBlockButton" && el.key !== "unnestBlockButton",
  );
  return (
    <FormattingToolbar blockTypeSelectItems={[]}>{items}</FormattingToolbar>
  );
};
