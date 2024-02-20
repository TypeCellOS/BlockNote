import { mergeCSSClasses } from "@blocknote/core";
import { Group } from "@mantine/core";
import { forwardRef, HTMLAttributes } from "react";

// TODO: move to mantine dir?
export const ToolbarWrapper = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <Group
      className={mergeCSSClasses("bn-toolbar", className || "")}
      ref={ref}
      {...rest}>
      {children}
    </Group>
  );
});
