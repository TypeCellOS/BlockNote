import {
  blockHasType,
  BlockSchema,
  defaultProps,
  DefaultProps,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FormattingToolbar as FormattingToolbarExtension } from "@blocknote/core/extensions";
import { flip, offset, shift } from "@floating-ui/react";
import { FC, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../hooks/useEditorState.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
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
  floatingUIOptions?: FloatingUIOptions;
}) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();
  const formattingToolbar = useExtension(FormattingToolbarExtension, {
    editor,
  });
  const show = useExtensionState(FormattingToolbarExtension, {
    editor,
    selector: (state) => state.show,
  });

  const position = useEditorState({
    editor,
    selector: ({ editor }) =>
      formattingToolbar.store.state.show
        ? {
            from: editor.prosemirrorState.selection.from,
            to: editor.prosemirrorState.selection.to,
          }
        : undefined,
  });

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

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open: show,
        // Needed as hooks like `useDismiss` call `onOpenChange` to change the
        // open state.
        onOpenChange: (open) => {
          formattingToolbar.store.setState({ show: open });
        },
        placement,
        middleware: [offset(10), shift(), flip()],
      },
      elementProps: {
        style: {
          zIndex: 40,
        },
      },
    }),
    [formattingToolbar.store, show, placement],
  );

  const Component = props.formattingToolbar || FormattingToolbar;

  return (
    <PositionPopover
      position={position}
      {...floatingUIOptions}
      {...props.floatingUIOptions}
    >
      {show && <Component />}
    </PositionPopover>
  );
};
