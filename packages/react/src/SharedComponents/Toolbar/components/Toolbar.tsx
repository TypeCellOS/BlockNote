import { createStyles, Group } from "@mantine/core";
import { forwardRef, HTMLAttributes } from "react";

export const Toolbar = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "Toolbar",
  });

  return (
    <Group
      className={
        props.className ? `${classes.root} ${props.className}` : classes.root
      }
      ref={ref}
      {...props}>
      {props.children}
    </Group>
  );
});
