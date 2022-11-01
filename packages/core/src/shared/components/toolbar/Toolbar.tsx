import { Box, DefaultProps, Group, Selectors } from "@mantine/core";
import { ReactElement } from "react";
import useStyles from "./Toolbar.styles";

type ToolbarStylesNames = Selectors<typeof useStyles>;

interface ToolbarProps extends DefaultProps<ToolbarStylesNames, {}> {
  children: ReactElement;
}

export const Toolbar = (props: ToolbarProps) => {
  const { classes, cx } = useStyles(
    // First argument of useStyles is styles params
    {},
    // Second argument is responsible for styles api integration
    {
      name: "Toolbar",
      classNames: props.classNames,
      styles: props.styles,
      unstyled: props.unstyled,
    }
  );

  return (
    <Box
      className={cx(classes.root, classes.items, props.className)}
      // sx={(theme) => ({
      //   backgroundColor: "white",
      //   border: `1px solid ${theme.colors.brandFinal[1]}`,
      //   borderRadius: "6px",
      //   width: "fit-content",
      // })}
    >
      <Group p={2} noWrap grow={false} spacing={2}>
        {props.children}
      </Group>
    </Box>
  );
};
