import {
  blockHasType,
  BlockSchema,
  defaultProps,
  DefaultProps,
  editorHasBlockWithType,
  InlineContentSchema,
  mapTableCell,
  StyleSchema,
  TableContent,
} from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";
import { useCallback } from "react";
import type { IconType } from "../../../icons.js";
import {
  RiAlignCenter,
  RiAlignJustify,
  RiAlignLeft,
  RiAlignRight,
} from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorDirection } from "../../../hooks/useEditorDirection.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";

type TextAlignment = DefaultProps["textAlignment"];

const icons: Record<TextAlignment, IconType> = {
  left: RiAlignLeft,
  center: RiAlignCenter,
  right: RiAlignRight,
  justify: RiAlignJustify,
};

export const TextAlignButton = (props: { textAlignment: TextAlignment }) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const direction = useEditorDirection();

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable || !editor.domElement) {
        return undefined;
      }

      const selectedBlocks = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];

      const alignments = selectedBlocks.flatMap((block) => {
        if (
          blockHasType(block, editor, block.type, {
            textAlignment: defaultProps.textAlignment,
          })
        ) {
          return [block.props.textAlignment];
        }
        if (
          selectedBlocks.length === 1 &&
          blockHasType(block, editor, "table")
        ) {
          const selection = editor
            .getExtension(TableHandlesExtension)
            ?.getCellSelection();
          const content = block.content as TableContent<
            InlineContentSchema,
            StyleSchema
          >;
          return (
            selection?.cells.map(
              ({ row, col }) =>
                mapTableCell(content.rows[row].cells[col]).props.textAlignment,
            ) ?? []
          );
        }
        return [];
      });
      return alignments.length
        ? { alignments, blocks: selectedBlocks }
        : undefined;
    },
  });

  const setTextAlignment = useCallback(
    (textAlignment: TextAlignment) => {
      if (state === undefined) {
        return;
      }

      editor.focus();
      for (const block of state.blocks) {
        if (
          blockHasType(block, editor, block.type, {
            textAlignment: defaultProps.textAlignment,
          }) &&
          editorHasBlockWithType(editor, block.type, {
            textAlignment: defaultProps.textAlignment,
          })
        ) {
          editor.updateBlock(block, {
            props: { textAlignment: textAlignment },
          });
        } else if (blockHasType(block, editor, "table")) {
          editor
            .getExtension(TableHandlesExtension)
            ?.setCellTextAlignment(textAlignment);
        }
      }
    },
    [editor, state],
  );

  if (state === undefined) {
    return null;
  }

  const Icon: IconType = icons[props.textAlignment];
  const labelAlignment =
    direction === "rtl" && props.textAlignment === "left"
      ? "right"
      : direction === "rtl" && props.textAlignment === "right"
        ? "left"
        : props.textAlignment;
  const tooltip = dict.formatting_toolbar[`align_${labelAlignment}`].tooltip;
  return (
    <Components.FormattingToolbar.Button
      className={"bn-button bn-text-align-button"}
      data-test={`alignText${
        props.textAlignment.slice(0, 1).toUpperCase() +
        props.textAlignment.slice(1)
      }`}
      onClick={() => setTextAlignment(props.textAlignment)}
      isSelected={state.alignments.every(
        (alignment) => alignment === props.textAlignment,
      )}
      label={tooltip}
      mainTooltip={tooltip}
      icon={<Icon />}
    />
  );
};
