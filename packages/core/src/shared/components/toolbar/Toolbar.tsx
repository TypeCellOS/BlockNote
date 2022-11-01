import { Box, Group } from "@mantine/core";
import { ReactNode } from "react";
import useStyles from "./Toolbar.styles";

export const Toolbar = (props: { children: ReactNode }) => {
  const { classes } = useStyles(undefined, { name: "Toolbar" });

  return (
    <Box className={classes.root}>
      <Group className={classes.wrapper}>{props.children}</Group>
    </Box>
  );
};
