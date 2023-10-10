import { createStyles, Group } from "@mantine/core";
import { ReactNode } from "react";

export const SideMenu = (props: { children: ReactNode }) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "SideMenu",
  });

  return (
    <Group className={classes.root} spacing={0}>
      {props.children}
    </Group>
  );
};
