import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  SpecificBlock,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { DragHandleMenuProps } from "../DragHandleMenuProps.js";

export const TableRowHeaderItem = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: Omit<DragHandleMenuProps<BSchema, I, S>, "block"> & {
    block: SpecificBlock<{ table: DefaultBlockSchema["table"] }, "table", I, S>;
    children: ReactNode;
  },
) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  if (props.block.type !== "table" || !editor.settings.tables.headers) {
    return null;
  }

  // TODO only support 1 header row for now
  const isHeaderRow = Boolean(props.block.content.headerRows);

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      checked={isHeaderRow}
      onClick={() => {
        // The block may have been modified and out of date, so we get the latest block
        const block = editor.getBlock(props.block.id);
        if (!block) {
          return;
        }
        editor.updateBlock(block, {
          ...block,
          content: {
            ...block.content,
            headerRows: isHeaderRow ? undefined : 1,
          },
        });
      }}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
};

export const TableColumnHeaderItem = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: Omit<DragHandleMenuProps<BSchema, I, S>, "block"> & {
    block: SpecificBlock<{ table: DefaultBlockSchema["table"] }, "table", I, S>;
    children: ReactNode;
  },
) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  if (props.block.type !== "table" || !editor.settings.tables.headers) {
    return null;
  }

  // TODO only support 1 header column for now
  const isHeaderColumn = Boolean(props.block.content.headerCols);

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      checked={isHeaderColumn}
      onClick={() => {
        editor.updateBlock(props.block, {
          type: "table",
          content: {
            ...props.block.content,
            type: "tableContent",
            headerCols: isHeaderColumn ? undefined : 1,
          },
        });
      }}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
};
