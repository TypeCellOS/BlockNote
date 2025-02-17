import {
  BlockSchema,
  checkBlockHasDefaultProp,
  checkBlockTypeHasDefaultProp,
  DefaultProps,
  InlineContentSchema,
  isTableCellSelection,
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

    if (checkBlockHasDefaultProp("textAlignment", block, editor)) {
      return block.props.textAlignment;
    }

    return;
  }, [editor, selectedBlocks]);

  const setTextAlignment = useCallback(
    (textAlignment: TextAlignment) => {
      editor.focus();

      for (const block of selectedBlocks) {
        if (checkBlockTypeHasDefaultProp("textAlignment", block.type, editor)) {
          editor.updateBlock(block, {
            props: { textAlignment: textAlignment },
          });
        } else if (block.type === "table") {
          // TODO document this, it is a mess
          const state = editor.prosemirrorState;
          const selection = state.selection;

          let $fromCell = selection.$from;
          let $toCell = selection.$to;
          if (isTableCellSelection(selection)) {
            const { ranges } = selection;
            ranges.forEach((range) => {
              $fromCell = range.$from.min($fromCell ?? range.$from);
              $toCell = range.$to.max($toCell ?? range.$to);
            });
          } else {
            // Assumes we are within a tableParagraph
            $fromCell = state.doc.resolve(
              selection.$from.pos - selection.$from.parentOffset - 1
            );
            $toCell = state.doc.resolve(
              selection.$to.pos - selection.$to.parentOffset - 1
            );
          }

          const $fromRow = state.doc.resolve(
            $fromCell.pos - $fromCell.parentOffset - 1
          );
          const $toRow = state.doc.resolve(
            $toCell.pos - $toCell.parentOffset - 1
          );
          const $table = state.doc.resolve(
            $fromRow.pos - $fromRow.parentOffset - 1
          );

          const fromColIndex = $fromCell.index($fromRow.depth);
          const fromRowIndex = $fromRow.index($table.depth);
          const toColIndex = $toCell.index($toRow.depth);
          const toRowIndex = $toRow.index($table.depth);

          const newTable = (block.content as TableContent<any, any>).rows.map(
            (row, r) => {
              return {
                ...row,
                cells: row.cells.map((cell, c) => {
                  const mappedCell = mapTableCell(cell);
                  // If the cell is within the selected range, update the text alignment
                  if (
                    fromRowIndex <= r &&
                    r <= toRowIndex &&
                    fromColIndex <= c &&
                    c <= toColIndex
                  ) {
                    return {
                      ...mappedCell,
                      props: {
                        ...mappedCell.props,
                        textAlignment: textAlignment,
                      },
                    };
                  }
                  return mappedCell;
                }),
              };
            }
          );

          editor.updateBlock(block, {
            type: "table",
            content: {
              type: "tableContent",
              rows: newTable,
            } as any,
          });
        }
      }
    },
    [editor, selectedBlocks]
  );

  const show = useMemo(() => {
    return !!selectedBlocks.find(
      (block) =>
        "textAlignment" in block.props ||
        (block.type === "table" && block.children)
    );
  }, [selectedBlocks]);

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
