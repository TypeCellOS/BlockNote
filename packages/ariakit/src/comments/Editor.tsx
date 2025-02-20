import { assertEmpty } from "@blocknote/core";
import {
  ComponentProps,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
} from "@blocknote/react";
import { forwardRef, useEffect } from "react";
import { BlockNoteView } from "../BlockNoteView.js";

export const Editor = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Editor"]
>((props, ref) => {
  const { className, onFocus, onBlur, editor, editable, ...rest } = props;

  assertEmpty(rest, false);

  // When we click the edit button on a comment, we also want to focus the
  // comment editor
  useEffect(() => {
    if (editable) {
      editor.focus();
    }
  }, [editable, editor]);

  return (
    <BlockNoteView
      autoFocus={true}
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
