import {
  Block,
  blockHasType,
  BlockNoteEditor,
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
import { TextSelection } from "@tiptap/pm/state";
import { TableMap } from "@tiptap/pm/tables";
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

function getCellCursorOffset(tiptapEditor: { state: { selection: { $from: any } } }): number {
  const { $from } = tiptapEditor.state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    const role = $from.node(d).type.spec.tableRole as string | undefined;
    if (role === "cell" || role === "header_cell") {
      return $from.pos - $from.start(d);
    }
  }
  return 0;
}

function restoreTableCellCursor(
  tiptapEditor: { state: any; view: any },
  targetRow: number,
  targetCol: number,
  cellOffset: number,
): void {
  const { state, view } = tiptapEditor;
  const { $from } = state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    if ($from.node(d).type.name === "table") {
      const tableMap = TableMap.get($from.node(d));
      if (targetRow < tableMap.height && targetCol < tableMap.width) {
        const cellPos = $from.start(d) + tableMap.map[targetRow * tableMap.width + targetCol];
        view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, cellPos + 1 + cellOffset)));
      }
      break;
    }
  }
}

function applyTextAlignmentToTableBlock(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
  block: Block<any, any, any>,
  textAlignment: TextAlignment,
): void {
  const cellSelection = editor
    .getExtension(TableHandlesExtension)
    ?.getCellSelection();
  if (!cellSelection) return;

  const { row: targetRow, col: targetCol } = cellSelection.cells[0];
  const savedCellOffset = getCellCursorOffset(editor._tiptapEditor);

  const newTable = (block.content as TableContent<any, any>).rows.map(
    (row) => ({
      ...row,
      cells: row.cells.map((cell) => mapTableCell(cell)),
    }),
  );

  cellSelection.cells.forEach(({ row, col }) => {
    if (!newTable[row]?.cells[col]) return;
    newTable[row].cells[col] = {
      ...newTable[row].cells[col],
      props: { ...newTable[row].cells[col].props, textAlignment },
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
  restoreTableCellCursor(editor._tiptapEditor, targetRow, targetCol, savedCellOffset);
  editor.focus();
}

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
          applyTextAlignmentToTableBlock(editor, block, textAlignment);
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
