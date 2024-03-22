import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  TableContent,
} from "@blocknote/core";

import { useComponentsContext } from "../../../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../../../hooks/useBlockNoteEditor";
import { TableHandleMenuProps } from "../../TableHandleMenuProps";

export const DeleteRowButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S>
) => {
  const components = useComponentsContext()!;
  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  return (
    <components.MenuItem
      onClick={() => {
        const content: TableContent<I, S> = {
          type: "tableContent",
          rows: props.block.content.rows.filter(
            (_, index) => index !== props.index
          ),
        };

        editor.updateBlock(props.block, {
          type: "table",
          content,
        });
      }}>
      Delete row
    </components.MenuItem>
  );
};

export const DeleteColumnButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S>
) => {
  const components = useComponentsContext()!;
  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  return (
    <components.MenuItem
      onClick={() => {
        const content: TableContent<I, S> = {
          type: "tableContent",
          rows: props.block.content.rows.map((row) => ({
            cells: row.cells.filter((_, index) => index !== props.index),
          })),
        };

        editor.updateBlock(props.block, {
          type: "table",
          content,
        });
      }}>
      Delete column
    </components.MenuItem>
  );
};

export const DeleteButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleMenuProps<I, S> & { orientation: "row" | "column" }
) =>
  props.orientation === "row" ? (
    <DeleteRowButton {...props} />
  ) : (
    <DeleteColumnButton {...props} />
  );
