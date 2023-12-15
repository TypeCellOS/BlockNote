import { Group } from "@mantine/core";
import { forwardRef, HTMLAttributes } from "react";
import { mergeCSSClasses } from "@blocknote/core";

export const Toolbar = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <Group
    className={mergeCSSClasses("bn-toolbar", props.className || "")}
    ref={ref}
    {...props}>
    {props.children}
  </Group>
));
