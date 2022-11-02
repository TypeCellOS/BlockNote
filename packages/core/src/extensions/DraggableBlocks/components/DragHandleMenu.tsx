import { createStyles, Menu } from "@mantine/core";

type Props = {
  onDelete: () => void;
};

const DragHandleMenu = (props: Props) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "DragHandleMenu",
  });

  return (
    <Menu.Dropdown className={classes.root}>
      <Menu.Item onClick={props.onDelete}>Delete</Menu.Item>
    </Menu.Dropdown>
  );
};

export default DragHandleMenu;
