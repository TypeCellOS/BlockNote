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
import { useCallback, useMemo } from "react";
import { IconType } from "react-icons";
import {
  RiAlignCenter,
  RiAlignJustify,
  RiAlignLeft,
  RiAlignRight,
} from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";
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

  const selectedBlocks = useSelectedBlocks(editor);

  const textAlignment = useMemo(() => {
    const block = selectedBlocks[0];

    if (
      blockHasType(block, editor, block.type, {
        textAlignment: defaultProps.textAlignment,
      })
    ) {
      return block.props.textAlignment;
    }
    if (block.type === "table") {
      const cellSelection = editor.tableHandles?.getCellSelection();
      if (!cellSelection) {
        return;
      }
      const allCellsInTable = cellSelection.cells.map(
        ({ row, col }) =>
          mapTableCell(
            (block.content as TableContent<any, any>).rows[row].cells[col],
          ).props.textAlignment,
      );
      const firstAlignment = allCellsInTable[0];

      if (allCellsInTable.every((alignment) => alignment === firstAlignment)) {
        return firstAlignment;
      }
    }

    return;
  }, [editor, selectedBlocks]);

  const setTextAlignment = useCallback(
    (textAlignment: TextAlignment) => {
      editor.focus();

      for (const block of selectedBlocks) {
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
          const cellSelection = editor.tableHandles?.getCellSelection();
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
    [editor, selectedBlocks],
  );

  const show = useMemo(() => {
    return !!selectedBlocks.find(
      (block) =>
        blockHasType(block, editor, block.type, {
          textAlignment: defaultProps.textAlignment,
        }) ||
        (block.type === "table" && block.children),
    );
  }, [editor, selectedBlocks]);

  if (!show || !editor.isEditable) {
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
      isSelected={textAlignment === props.textAlignment}
      label={dict.formatting_toolbar[`align_${props.textAlignment}`].tooltip}
      mainTooltip={
        dict.formatting_toolbar[`align_${props.textAlignment}`].tooltip
      }
      icon={<Icon />}
    />
  );
};
