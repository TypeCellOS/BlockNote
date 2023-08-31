import { forwardRef, HTMLAttributes, ReactElement } from "react";
import { createStyles, Stack } from "@mantine/core";
import { ToolbarInputDropdownItem } from "./ToolbarInputDropdownItem";

export type ToolbarInputDropdownProps = {
  children:
    | ReactElement<typeof ToolbarInputDropdownItem>
    | Array<ReactElement<typeof ToolbarInputDropdownItem>>;
};

export const ToolbarInputDropdown = forwardRef<
  HTMLDivElement,
  ToolbarInputDropdownProps & HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "ToolbarInputDropdown",
  });

  return (
    <Stack
      {...props}
      className={className ? `${classes.root} ${className}` : classes.root}
      ref={ref}>
      {props.children}
    </Stack>
  );
});
