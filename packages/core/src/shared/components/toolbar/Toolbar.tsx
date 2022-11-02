import { createStyles, Group } from "@mantine/core";
import { ReactNode } from "react";

export const Toolbar = (props: { children: ReactNode }) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "Toolbar",
  });

  return <Group className={classes.root}>{props.children}</Group>;
};
