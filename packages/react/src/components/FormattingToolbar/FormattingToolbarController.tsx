import {
  blockHasType,
  BlockSchema,
  defaultProps,
  DefaultProps,
  FormattingToolbar as FormattingToolbarExtension,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { flip, offset, shift } from "@floating-ui/react";
import { FC, useEffect, useMemo, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../hooks/useEditorState.js";
import { usePluginState } from "../../hooks/usePlugin.js";
import { PositionPopover } from "../Popovers/PositionPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
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

  const [open, setOpen] = useState(false);

  const show = usePluginState(FormattingToolbarExtension, {
    editor,
    selector: (state) => state.show,
  });
  useEffect(() => {
    setOpen(show);
  }, [show]);

  const position = useEditorState({
    editor,
    selector: ({ editor }) =>
      show
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
        open,
        // Needed as hooks like `useDismiss` call `onOpenChange` to change the
        // open state.
        onOpenChange: setOpen,
        placement,
        middleware: [offset(10), shift(), flip()],
      },
      elementProps: {
        style: {
          zIndex: 40,
        },
      },
      ...props.floatingUIOptions,
    }),
    [open, placement, props.floatingUIOptions],
  );

  const Component = props.formattingToolbar || FormattingToolbar;

  return (
    <PositionPopover position={position} {...floatingUIOptions}>
      {show && <Component />}
    </PositionPopover>
  );
};
