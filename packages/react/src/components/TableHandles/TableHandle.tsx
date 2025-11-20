import {
  getColspan,
  getRowspan,
  mergeCSSClasses,
  TableHandles,
} from "@blocknote/core";
import { ReactNode, useMemo, useState } from "react";

import { MdDragIndicator } from "react-icons/md";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { usePlugin, usePluginState } from "../../hooks/usePlugin.js";
import { TableHandleMenu } from "./TableHandleMenu/TableHandleMenu.js";
import { TableHandleProps } from "./TableHandleProps.js";

/**
 * By default, the TableHandle component will render with the default icon.
 * However, you can override the icon to render by passing children.
 */
export const TableHandle = (
  props: TableHandleProps & {
    children?: ReactNode;
  },
) => {
  const editor = useBlockNoteEditor<any, any, any>();
  const Components = useComponentsContext()!;

  const [isDragging, setIsDragging] = useState(false);

  const Component = props.tableHandleMenu || TableHandleMenu;

  const tableHandles = usePlugin(TableHandles);
  const state = usePluginState(TableHandles);

  const isDraggable = useMemo(() => {
    if (
      !tableHandles ||
      !state ||
      !state.block ||
      state.block.type !== "table"
    ) {
      return false;
    }

    if (props.orientation === "column") {
      return tableHandles
        .getCellsAtColumnHandle(state.block, state.colIndex!)
        .every(({ cell }) => getColspan(cell) === 1);
    }

    return tableHandles
      .getCellsAtRowHandle(state.block, state.rowIndex!)
      .every(({ cell }) => getRowspan(cell) === 1);
  }, [props.orientation, state, tableHandles]);

  if (!state) {
    return null;
  }

  return (
    <Components.Generic.Menu.Root
      onOpenChange={(open: boolean) => {
        if (open) {
          tableHandles.freezeHandles();
          // tableHandles.hideOtherSide();
        } else {
          tableHandles.unfreezeHandles();
          // props.showOtherSide();
          editor.focus();
        }
      }}
      position={"right"}
    >
      <Components.Generic.Menu.Trigger>
        <Components.TableHandle.Root
          className={mergeCSSClasses(
            "bn-table-handle",
            isDragging ? "bn-table-handle-dragging" : "",
            !isDraggable ? "bn-table-handle-not-draggable" : "",
          )}
          draggable={isDraggable}
          onDragStart={(e) => {
            setIsDragging(true);
            if (props.orientation === "column") {
              tableHandles.colDragStart(e);
            } else {
              tableHandles.rowDragStart(e);
            }
          }}
          onDragEnd={() => {
            tableHandles.dragEnd();
            setIsDragging(false);
          }}
          style={
            props.orientation === "column"
              ? { transform: "rotate(0.25turn)" }
              : undefined
          }
        >
          {props.children || (
            <MdDragIndicator size={24} data-test={"tableHandle"} />
          )}
        </Components.TableHandle.Root>
      </Components.Generic.Menu.Trigger>
      <Component orientation={props.orientation} />
    </Components.Generic.Menu.Root>
  );
};
