import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import { Menu } from "@mantine/core";
import { ReactNode, useState } from "react";

import type { TableHandleProps } from "./DefaultPositionedTableHandles";
import { DefaultTableHandleMenu } from "./TableHandleMenu/DefaultTableHandleMenu";

export const TableHandle = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: TableHandleProps<I, S> & { children: ReactNode }
) => {
  const TableHandleMenu = props.tableHandleMenu || DefaultTableHandleMenu;

  const [isDragging, setIsDragging] = useState(false);

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
          {props.children}
        </div>
      </Menu.Target>
      <TableHandleMenu
        orientation={props.orientation}
        editor={props.editor as any}
        block={props.block as any}
        index={props.index}
      />
    </Menu>
  );
};
