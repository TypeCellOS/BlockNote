import { Group } from "@mantine/core";
import { forwardRef, HTMLAttributes } from "react";
import { mergeCSSClasses } from "@blocknote/core";

export const Toolbar = forwardRef<
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
