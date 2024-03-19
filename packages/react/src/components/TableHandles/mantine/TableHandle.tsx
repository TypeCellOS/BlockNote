import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode, useState } from "react";

import { MdDragIndicator } from "react-icons/md";
import { useComponentsContext } from "../../../editor/ComponentsContext";
import { TableHandleMenu } from "../TableHandleMenu/mantine/TableHandleMenu";
import { TableHandleProps } from "../TableHandleProps";

/**
 * By default, the TableHandle component will render with the default icon.
 * However, you can override the icon to render by passing children.
 */
export const TableHandle = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleProps<I, S> & { children?: ReactNode }
) => {
  const components = useComponentsContext()!;
  const [isDragging, setIsDragging] = useState(false);

  const Component = props.tableHandleMenu || TableHandleMenu;

  return (
    <components.Menu
      trigger={"click"}
      onOpen={() => {
        props.freezeHandles();
        props.hideOtherSide();
      }}
      onClose={() => {
        props.unfreezeHandles();
        props.showOtherSide();
      }}
      position={"right"}>
      <components.MenuTarget>
        <div
          className={mergeCSSClasses(
            "bn-table-handle",
            isDragging ? "bn-table-handle-dragging" : ""
          )}
          draggable="true"
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
          }>
          {props.children || (
            <MdDragIndicator size={24} data-test={"tableHandle"} />
          )}
        </div>
      </components.MenuTarget>
      <Component
        orientation={props.orientation}
        block={props.block as any}
        index={props.index}
      />
    </components.Menu>
  );
};
