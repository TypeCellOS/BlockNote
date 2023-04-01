import { createStyles, Menu } from "@mantine/core";
import { ReactNode } from "react";

export const DragHandleMenu = (props: { children: ReactNode }) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "DragHandleMenu",
  });

  return (
    <Menu.Dropdown className={classes.root}>{props.children}</Menu.Dropdown>
  );
};
