import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import { Menu } from "@mantine/core";
import { ReactNode, useState } from "react";

import { TableHandleProps } from "../TableHandleProps";
import { MdDragIndicator } from "react-icons/md";
import { TableHandleMenu } from "../TableHandleMenu/mantine/TableHandleMenu";

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
  const [isDragging, setIsDragging] = useState(false);

  const Component = props.tableHandleMenu || TableHandleMenu;

  return (
    <Menu
      withinPortal={false}
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
      <Menu.Target>
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
      </Menu.Target>
      <Component
        orientation={props.orientation}
        block={props.block as any}
        index={props.index}
      />
    </Menu>
  );
};
