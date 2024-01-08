import { forwardRef, HTMLAttributes, ReactElement } from "react";
import { Stack } from "@mantine/core";

import { InputProps } from "./ToolbarInputDropdownItem";
import { mergeCSSClasses } from "@blocknote/core";

export type ToolbarInputDropdownProps = {
  children:
    | ReactElement<InputProps[keyof InputProps]>
    | Array<ReactElement<InputProps[keyof InputProps]>>;
};

export const ToolbarInputDropdown = forwardRef<
  HTMLDivElement,
  ToolbarInputDropdownProps & HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <Stack
      {...props}
      className={mergeCSSClasses("bn-toolbar-input-dropdown", className || "")}
      ref={ref}>
      {props.children}
    </Stack>
  );
});
