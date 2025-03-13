import { assertEmpty } from "@blocknote/core";
import {
  ComponentProps,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
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
      ref={ref}
      onFocus={onFocus}
      onBlur={onBlur}>
      <FormattingToolbarController
        formattingToolbar={CustomFormattingToolbar}
      />
    </BlockNoteView>
  );
});

const CustomFormattingToolbar = () => {
  const items = getFormattingToolbarItems([]).filter(
    (el) => el.key !== "nestBlockButton" && el.key !== "unnestBlockButton"
  );
  return (
    <FormattingToolbar blockTypeSelectItems={[]}>{items}</FormattingToolbar>
  );
};
