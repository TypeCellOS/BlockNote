import { TableContent } from "@blocknote/core";

import { Menu } from "@mantine/core";
import { MdDragIndicator } from "react-icons/md";
import { SideMenuButton } from "../../SideMenu/components/SideMenuButton";
import { TableHandlesProps } from "./TableHandlePositioner";

const DefaultTableHandleLeft = (props: TableHandlesProps) => {
  return (
    <Menu
      trigger={"click"}
      onOpen={() => {
        props.freezeMenu();
        props.hideOtherSide();
      }}
      onClose={() => {
        props.unfreezeMenu();
        props.showOtherSide();
      }}
      position={"right"}>
      <Menu.Target>
        <div
          draggable="true"
          onDragStart={props.rowDragStart}
          onDragEnd={props.dragEnd}>
          <SideMenuButton>
            <MdDragIndicator size={24} data-test={"dragHandle"} />
          </SideMenuButton>
        </div>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          onClick={() => {
            const content: TableContent = {
              type: "tableContent",
              rows: props.block.content.rows.filter(
                (_, index) => index !== props.rowIndex
              ),
            };

            props.editor.updateBlock(props.block, { type: "table", content });
          }}>
          Delete row
        </Menu.Item>
        <Menu.Item
          onClick={() => {
            const emptyCol = props.block.content.rows[props.rowIndex].cells.map(
              () => []
            );
            const rows = [...props.block.content.rows];
            rows.splice(props.rowIndex, 0, {
              cells: emptyCol,
            });

            props.editor.updateBlock(props.block, {
              type: "table",
              content: {
                type: "tableContent",
                rows,
              },
            });
          }}>
          Add row above
        </Menu.Item>
        <Menu.Item
          onClick={() => {
            const emptyCol = props.block.content.rows[props.rowIndex].cells.map(
              () => []
            );

            const rows = [...props.block.content.rows];
            rows.splice(props.rowIndex + 1, 0, {
              cells: emptyCol,
            });

            props.editor.updateBlock(props.block, {
              content: {
                type: "tableContent",
                rows,
              },
            });
          }}>
          Add row below
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

const DefaultTableHandleTop = (props: TableHandlesProps) => {
  return (
    <Menu
      trigger={"click"}
      onOpen={() => {
        props.freezeMenu();
        props.hideOtherSide();
      }}
      onClose={() => {
        props.unfreezeMenu();
        props.showOtherSide();
      }}
      position={"bottom"}>
      <Menu.Target>
        <div
          draggable={"true"}
          onDragStart={props.colDragStart}
          onDragEnd={props.dragEnd}>
          <SideMenuButton>
            <MdDragIndicator
              size={24}
              data-test={"dragHandle"}
              style={{ transform: "rotate(90deg)" }}
            />
          </SideMenuButton>
        </div>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          onClick={() => {
            const content: TableContent = {
              type: "tableContent",
              rows: props.block.content.rows.map((row) => ({
                cells: row.cells.filter((_, index) => index !== props.colIndex),
              })),
            };

            props.editor.updateBlock(props.block, { content });
          }}>
          Delete column
        </Menu.Item>
        <Menu.Item
          onClick={() => {
            const content: TableContent = {
              type: "tableContent",
              rows: props.block.content.rows.map((row) => {
                const cells = [...row.cells];
                cells.splice(props.colIndex, 0, []);
                return { cells };
              }),
            };

            props.editor.updateBlock(props.block, { content });
          }}>
          Add column left
        </Menu.Item>
        <Menu.Item
          onClick={() => {
            const content: TableContent = {
              type: "tableContent",
              rows: props.block.content.rows.map((row) => {
                const cells = [...row.cells];
                cells.splice(props.colIndex + 1, 0, []);
                return { cells };
              }),
            };

            props.editor.updateBlock(props.block, { content });
          }}>
          Add column right
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export const DefaultTableHandle = (props: TableHandlesProps) => {
  if (props.side === "left") {
    return <DefaultTableHandleLeft {...props} />;
  } else {
    return <DefaultTableHandleTop {...props} />;
  }
};
