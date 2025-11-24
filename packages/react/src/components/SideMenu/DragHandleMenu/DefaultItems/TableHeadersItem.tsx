import { DefaultBlockSchema, SpecificBlock } from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useExtensionState } from "../../../../hooks/useExtension.js";

export const TableRowHeaderItem = (props: { children: ReactNode }) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    any,
    any
  >();

  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) =>
      state?.block as
        | SpecificBlock<
            { table: DefaultBlockSchema["table"] },
            "table",
            any,
            any
          >
        | undefined,
  });

  if (
    block === undefined ||
    block.type !== "table" ||
    !editor.settings.tables.headers
  ) {
    return null;
  }

  // TODO only support 1 header row for now
  const isHeaderRow = Boolean(block.content.headerRows);

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      checked={isHeaderRow}
      onClick={() => {
        editor.updateBlock(block, {
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

export const TableColumnHeaderItem = (props: { children: ReactNode }) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    any,
    any
  >();

  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) =>
      state?.block as
        | SpecificBlock<
            { table: DefaultBlockSchema["table"] },
            "table",
            any,
            any
          >
        | undefined,
  });

  if (
    block === undefined ||
    block.type !== "table" ||
    !editor.settings.tables.headers
  ) {
    return null;
  }

  // TODO only support 1 header column for now
  const isHeaderColumn = Boolean(block.content.headerCols);

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      checked={isHeaderColumn}
      onClick={() => {
        editor.updateBlock(block, {
          content: {
            ...block.content,
            headerCols: isHeaderColumn ? undefined : 1,
          },
        });
      }}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
};
