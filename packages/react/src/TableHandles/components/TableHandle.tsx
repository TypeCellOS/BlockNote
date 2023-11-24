import { ReactNode, useState } from "react";
import { BlockSchema } from "@blocknote/core";
import { createStyles, Menu } from "@mantine/core";
import { TableHandleProps } from "./TableHandlePositioner";
import { DefaultTableHandleMenu } from "./TableHandleMenu/DefaultTableHandleMenu";

export const TableHandle = <BSchema extends BlockSchema>(
  props: TableHandleProps<BSchema> & { children: ReactNode }
) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "TableHandle",
  });

  const TableHandleMenu = props.tableHandleMenu || DefaultTableHandleMenu;

  const [isDragging, setIsDragging] = useState(false);

  return (
    <Menu
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
          className={classes.root}
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
          <div className={isDragging ? "bn-table-handle-dragging" : undefined}>
            {props.children}
          </div>
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
