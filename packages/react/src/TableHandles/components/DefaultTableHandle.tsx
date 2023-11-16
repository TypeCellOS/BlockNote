import { BlockSchema } from "@blocknote/core";

import { Menu } from "@mantine/core";
import { MdDragIndicator } from "react-icons/md";
import { SideMenuButton } from "../../SideMenu/components/SideMenuButton";
import { TableHandlesProps } from "./TableHandlePositioner";

const DefaultTableHandleLeft = <BSchema extends BlockSchema>(
  props: TableHandlesProps<BSchema>
) => {
  return (
    <Menu
      trigger={"click"}
      // onOpen={props.freezeMenu}
      // onClose={props.unfreezeMenu}

      position={"right"}>
      <Menu.Target>
        <div style={{ position: "relative", left: "24px" }}>
          <SideMenuButton>
            <MdDragIndicator size={24} data-test={"dragHandle"} />
          </SideMenuButton>
        </div>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item>Delete row</Menu.Item>
        <Menu.Item>Add row above</Menu.Item>
        <Menu.Item>Add row below</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

const DefaultTableHandleTop = <BSchema extends BlockSchema>(
  props: TableHandlesProps<BSchema>
) => {
  return (
    <Menu
      trigger={"click"}
      // onOpen={props.freezeMenu}
      // onClose={props.unfreezeMenu}

      position={"bottom"}>
      <Menu.Target>
        <div style={{ position: "relative", top: "24px" }}>
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
            console.log(props.block);
            debugger;
          }}>
          Delete column
        </Menu.Item>
        <Menu.Item>Add column left</Menu.Item>
        <Menu.Item>Add column right</Menu.Item>
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
