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
import { useCallback, useMemo } from "react";
import { IconType } from "react-icons";
import {
  RiAlignCenter,
  RiAlignJustify,
  RiAlignLeft,
  RiAlignRight,
} from "react-icons/ri";

import {
  ComponentProps,
  useComponentsContext,
} from "../../../editor/ComponentsContext.js";
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

const alignments: TextAlignment[] = ["left", "center", "right", "justify"];

export const TextAlignSelect = () => {
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

        if (!cellSelection || cellSelection.cells.length === 0) {
          return undefined;
        }

        const { row, col } = cellSelection.cells[0];
        const tableContent = firstBlock.content as TableContent<any, any>;
        const selectedCell = tableContent.rows[row]?.cells[col];

        if (!selectedCell) {
          return undefined;
        }

        return {
          textAlignment: mapTableCell(selectedCell).props.textAlignment,
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
            props: { textAlignment },
          });
        } else if (block.type === "table") {
          const cellSelection = editor
            .getExtension(TableHandlesExtension)
            ?.getCellSelection();
          if (!cellSelection) {
            continue;
          }

          const newTable = (block.content as TableContent<any, any>).rows.map(
            (row) => ({
              ...row,
              cells: row.cells.map((cell) => mapTableCell(cell)),
            }),
          );

          cellSelection.cells.forEach(({ row, col }) => {
            newTable[row].cells[col] = {
              ...newTable[row].cells[col],
              props: {
                ...newTable[row].cells[col].props,
                textAlignment,
              },
            };
          });

          editor.updateBlock(block, {
            type: "table",
            content: {
              ...(block.content as TableContent<any, any>),
              type: "tableContent",
              rows: newTable,
            } as any,
          });

          editor.setTextCursorPosition(block);
        }
      }
    },
    [editor, state],
  );

  const selectItems: ComponentProps["FormattingToolbar"]["Select"]["items"] =
    useMemo(
      () =>
        alignments.map((alignment) => {
          const Icon = icons[alignment];
          return {
            text: dict.formatting_toolbar[`align_${alignment}`].label,
            icon: <Icon size={16} />,
            isSelected: state?.textAlignment === alignment,
            onClick: () => setTextAlignment(alignment),
          };
        }),
      [dict, setTextAlignment, state?.textAlignment],
    );

  if (state === undefined) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Select
      className={"bn-select"}
      items={selectItems}
    />
  );
};
