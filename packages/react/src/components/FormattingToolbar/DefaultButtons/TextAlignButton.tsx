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
import { IconType } from "react-icons";
import {
  RiAlignCenter,
  RiAlignJustify,
  RiAlignLeft,
  RiAlignRight,
} from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
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

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return undefined;
      }

      const selectedBlocks = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];

      const firstBlock = selectedBlocks[0];

      if (
        blockHasType(firstBlock, editor, firstBlock.type, {
          textAlignment: defaultProps.textAlignment,
        })
      ) {
        return {
          textAlignment: firstBlock.props.textAlignment,
          blocks: selectedBlocks,
        };
      }

      if (
        selectedBlocks.length === 1 &&
        blockHasType(firstBlock, editor, "table")
      ) {
        const cellSelection = editor
          .getExtension(TableHandlesExtension)
          ?.getCellSelection();

        if (!cellSelection) {
          return undefined;
        }

        return {
          textAlignment: mapTableCell(
            (firstBlock.content as TableContent<any, any>).rows[0].cells[0],
          ).props.textAlignment,
          blocks: [firstBlock],
        };
      }

      return undefined;
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
        } else if (block.type === "table") {
          const cellSelection = editor
            .getExtension(TableHandlesExtension)
            ?.getCellSelection();
          if (!cellSelection) {
            continue;
          }

          const newTable = (block.content as TableContent<any, any>).rows.map(
            (row) => {
              return {
                ...row,
                cells: row.cells.map((cell) => {
                  return mapTableCell(cell);
                }),
              };
            },
          );

          // Apply the text alignment to the cells that are within the selected range
          cellSelection.cells.forEach(({ row, col }) => {
            newTable[row].cells[col].props.textAlignment = textAlignment;
          });

          editor.updateBlock(block, {
            type: "table",
            content: {
              ...(block.content as TableContent<any, any>),
              type: "tableContent",
              rows: newTable,
            } as any,
          });

          // Have to reset text cursor position to the block as `updateBlock`
          // moves the existing selection out of the block.
          editor.setTextCursorPosition(block);
        }
      }
    },
    [editor, state],
  );

  if (state === undefined) {
    return null;
  }

  const Icon: IconType = icons[props.textAlignment];
  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      data-test={`alignText${
        props.textAlignment.slice(0, 1).toUpperCase() +
        props.textAlignment.slice(1)
      }`}
      onClick={() => setTextAlignment(props.textAlignment)}
      isSelected={state.textAlignment === props.textAlignment}
      label={dict.formatting_toolbar[`align_${props.textAlignment}`].tooltip}
      mainTooltip={
        dict.formatting_toolbar[`align_${props.textAlignment}`].tooltip
      }
      icon={<Icon />}
    />
  );
};
