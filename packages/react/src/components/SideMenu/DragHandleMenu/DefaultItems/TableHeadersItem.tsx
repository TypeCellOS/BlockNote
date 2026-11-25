import { SideMenuExtension } from "@blocknote/core/extensions";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../../hooks/useEditorState.js";
import { useExtensionState } from "../../../../hooks/useExtension.js";

function TableHeaderItem(props: {
  children: ReactNode;
  header: "headerRows" | "headerCols";
}) {
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor();
  const blockId = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.blockId,
  });
  const checked = useEditorState({
    editor,
    on: "change",
    selector: () => {
      const block =
        blockId !== undefined ? editor.getBlock(blockId) : undefined;
      return block?.type === "table"
        ? Boolean(block.content[props.header])
        : undefined;
    },
  });

  if (
    blockId === undefined ||
    checked === undefined ||
    !editor.settings.tables.headers
  ) {
    return null;
  }

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      checked={checked}
      onClick={() => {
        // Read at click time: edits may have synced since the menu rendered.
        const block = editor.getBlock(blockId);
        if (block?.type !== "table") {
          return;
        }

        // Only one header row or column is supported here.
        editor.updateBlock(blockId, {
          content: {
            ...block.content,
            [props.header]: block.content[props.header] ? undefined : 1,
          },
        });
      }}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
}

export function TableRowHeaderItem(props: { children: ReactNode }) {
  return <TableHeaderItem {...props} header="headerRows" />;
}

export function TableColumnHeaderItem(props: { children: ReactNode }) {
  return <TableHeaderItem {...props} header="headerCols" />;
}
