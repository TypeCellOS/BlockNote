import {
  blockHasType,
  BlockNoteEditor,
  BlockSchema,
  defaultProps,
  DefaultProps,
  FormattingToolbarExtension,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { UseFloatingOptions, flip, offset, shift } from "@floating-ui/react";
import { FC, useCallback, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../hooks/useEditorState.js";
import { usePluginState } from "../../hooks/usePlugin.js";
import { PositionPopover } from "../Popovers/PositionPopover.js";
import { FormattingToolbar } from "./FormattingToolbar.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";

const textAlignmentToPlacement = (
  textAlignment: DefaultProps["textAlignment"],
) => {
  switch (textAlignment) {
    case "left":
      return "top-start";
    case "center":
      return "top";
    case "right":
      return "top-end";
    default:
      return "top-start";
  }
};

export const FormattingToolbarController = (props: {
  formattingToolbar?: FC<FormattingToolbarProps>;
  floatingUIOptions?: UseFloatingOptions;
}) => {
  const show = usePluginState(FormattingToolbarExtension, {
    selector: (state) => state.show,
  });

  const getPosition = useCallback(
    (editor: BlockNoteEditor<any, any, any>) => ({
      from: editor.prosemirrorState.selection.from,
      to: editor.prosemirrorState.selection.to,
    }),
    [],
  );

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const placement = useEditorState({
    editor,
    selector: ({ editor }) => {
      const block = editor.getTextCursorPosition().block;

      if (
        !blockHasType(block, editor, block.type, {
          textAlignment: defaultProps.textAlignment,
        })
      ) {
        return "top-start";
      } else {
        return textAlignmentToPlacement(block.props.textAlignment);
      }
    },
  });

  const floatingUIOptions = useMemo<UseFloatingOptions>(
    () => ({
      open: show,
      placement,
      middleware: [offset(10), shift(), flip()],
      ...props.floatingUIOptions,
    }),
    [placement, props.floatingUIOptions, show],
  );

  const Component = props.formattingToolbar || FormattingToolbar;

  return (
    <PositionPopover
      getPosition={getPosition}
      floatingUIOptions={floatingUIOptions}
    >
      <Component />
    </PositionPopover>
  );
};
