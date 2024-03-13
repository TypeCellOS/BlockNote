import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultProps,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { flip, offset } from "@floating-ui/react";
import { FC, useState } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { useEditorContentOrSelectionChange } from "../../hooks/useEditorContentOrSelectionChange";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import { useUIPluginState } from "../../hooks/useUIPluginState";
import { FormattingToolbarProps } from "./FormattingToolbarProps";
import { FormattingToolbar } from "./mantine/FormattingToolbar";

const textAlignmentToPlacement = (
  textAlignment: DefaultProps["textAlignment"]
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

export const FormattingToolbarController = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  formattingToolbar?: FC<FormattingToolbarProps<BSchema, I, S>>;
}) => {
  const editor = useBlockNoteEditor<BSchema, I, S>();

  const [placement, setPlacement] = useState<"top-start" | "top" | "top-end">(
    () => {
      const block = editor.getTextCursorPosition().block;

      if (!("textAlignment" in block.props)) {
        return "top-start";
      }

      return textAlignmentToPlacement(
        block.props.textAlignment as DefaultProps["textAlignment"]
      );
    }
  );

  useEditorContentOrSelectionChange(() => {
    const block = editor.getTextCursorPosition().block;

    if (!("textAlignment" in block.props)) {
      setPlacement("top-start");
    } else {
      setPlacement(
        textAlignmentToPlacement(
          block.props.textAlignment as DefaultProps["textAlignment"]
        )
      );
    }
  }, editor);

  const state = useUIPluginState(
    editor.formattingToolbar.onUpdate.bind(editor.formattingToolbar)
  );
  const { isMounted, ref, style } = useUIElementPositioning(
    state?.show || false,
    state?.referencePos || null,
    3000,
    {
      placement,
      middleware: [offset(10), flip()],
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  const { show, referencePos, ...data } = state;

  const Component = props.formattingToolbar || FormattingToolbar;

  return (
    <div ref={ref} style={style}>
      <Component {...data} />
    </div>
  );
};
