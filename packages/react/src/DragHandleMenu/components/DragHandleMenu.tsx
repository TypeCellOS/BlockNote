import { createStyles, Menu } from "@mantine/core";

export type DragHandleMenuProps = {
  deleteBlock: () => void;
};

export const DragHandleMenu = (props: DragHandleMenuProps) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "DragHandleMenu",
  });

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <Menu opened={true} position={"left"} offset={18}>
        <Menu.Target>
          <div></div>
        </Menu.Target>
        <Menu.Dropdown className={classes.root}>
          <Menu.Item onClick={props.deleteBlock}>Delete</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
};
