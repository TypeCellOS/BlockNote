import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  getColspan,
  getRowspan,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode, useMemo, useState } from "react";

import { createPortal } from "react-dom";
import { MdDragIndicator } from "react-icons/md";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { TableHandleMenu } from "./TableHandleMenu/TableHandleMenu.js";
import { TableHandleProps } from "./TableHandleProps.js";

/**
 * By default, the TableHandle component will render with the default icon.
 * However, you can override the icon to render by passing children.
 */
export const TableHandle = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: TableHandleProps<I, S> & { children?: ReactNode },
) => {
  const Components = useComponentsContext()!;

  const [isDragging, setIsDragging] = useState(false);

  const Component = props.tableHandleMenu || TableHandleMenu;

  const isDraggable = useMemo(() => {
    const tableHandles = props.editor.tableHandles;
    if (!tableHandles || !props.block || props.block.type !== "table") {
      return false;
    }

    if (props.orientation === "column") {
      return tableHandles
        .getCellsAtColumnHandle(props.block, props.index)
        .every(({ cell }) => getColspan(cell) === 1);
    }

    return tableHandles
      .getCellsAtRowHandle(props.block, props.index)
      .every(({ cell }) => getRowspan(cell) === 1);
  }, [props.block, props.editor.tableHandles, props.index, props.orientation]);

  return (
    <Components.Generic.Menu.Root
      onOpenChange={(open: boolean) => {
        if (open) {
          props.freezeHandles();
          props.hideOtherSide();
        } else {
          props.unfreezeHandles();
          props.showOtherSide();
          props.editor.focus();
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
            props.dragStart(e);
          }}
          onDragEnd={() => {
            props.dragEnd();
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
      {/* the menu can extend outside of the table, so we use a portal to prevent clipping */}
      {createPortal(
        <Component
          orientation={props.orientation}
          block={props.block as any}
          index={props.index}
        />,
        props.menuContainer,
      )}
    </Components.Generic.Menu.Root>
  );
};
