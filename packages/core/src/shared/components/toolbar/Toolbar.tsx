import {
  Box,
  Button,
  createStyles,
  DefaultProps,
  Group,
  MantineProvider,
  Menu,
  Selectors,
} from "@mantine/core";
import { BlockNoteTheme } from "../../../BlockNoteTheme";
import { HiChevronDown } from "react-icons/hi";
import { SimpleToolbarDropdownItem } from "./SimpleToolbarDropdownItem";
import { ReactElement } from "react";

type ToolbarStylesNames = Selectors<typeof useStyles>;

interface ToolbarProps extends DefaultProps<ToolbarStylesNames, {}> {
  children: ReactElement;
}

export const useStyles = createStyles((_theme, _params: {}) => ({
  // add all styles as usual
  root: {},
  items: {},
}));

export const Toolbar = (props: ToolbarProps) => {
  const { classes, cx } = useStyles(
    // First argument of useStyles is styles params
    {},
    // Second argument is responsible for styles api integration
    {
      name: "MyComponent",
      classNames: props.classNames,
      styles: props.styles,
      unstyled: props.unstyled,
    }
  );

  const test = BlockNoteTheme;
  console.log(classes);
  // debugger;

  return (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={BlockNoteTheme}>
      <Box
        className={cx(classes.root, props.className)}
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
    </MantineProvider>
  );
};
