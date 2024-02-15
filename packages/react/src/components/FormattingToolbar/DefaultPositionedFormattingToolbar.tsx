import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultProps,
} from "@blocknote/core";
import { flip, offset } from "@floating-ui/react";
import { FC, useState } from "react";

import { useUIPluginState } from "../../hooks/useUIPluginState";
import { useUiElementPositioning } from "../../hooks/useUiElementPositioning";
import { useEditorChange } from "../../hooks/useEditorChange";
import {
  DefaultFormattingToolbar,
  FormattingToolbarProps,
} from "./DefaultFormattingToolbar";

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

export const DefaultPositionedFormattingToolbar = <
  BSchema extends BlockSchema = DefaultBlockSchema
>(props: {
  editor: BlockNoteEditor<BSchema, any, any>;
  formattingToolbar?: FC<FormattingToolbarProps<BSchema>>;
}) => {
  const [placement, setPlacement] = useState<"top-start" | "top" | "top-end">(
    () => {
      const block = props.editor.getTextCursorPosition().block;

      if (!("textAlignment" in block.props)) {
        return "top-start";
      }

      return textAlignmentToPlacement(
        block.props.textAlignment as DefaultProps["textAlignment"]
      );
    }
  );

  useEditorChange(props.editor, () => {
    const block = props.editor.getTextCursorPosition().block;

    if (!("textAlignment" in block.props)) {
      setPlacement("top-start");
    } else {
      setPlacement(
        textAlignmentToPlacement(
          block.props.textAlignment as DefaultProps["textAlignment"]
        )
      );
    }
  });

  const state = useUIPluginState(
    props.editor.formattingToolbar.onUpdate.bind(props.editor.formattingToolbar)
  );
  const { isMounted, ref, style } = useUiElementPositioning(
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

  const FormattingToolbar = props.formattingToolbar || DefaultFormattingToolbar;

  return (
    <div ref={ref} style={style}>
      <FormattingToolbar editor={props.editor} />
    </div>
  );
};
