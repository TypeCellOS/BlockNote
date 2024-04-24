import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SideMenuButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["SideMenu"]["Button"]
>((props, ref) => {
  const { className, children, icon, onClick, ...rest } = props;

  if (icon) {
    return (
      <Mantine.ActionIcon
        className={className}
        ref={ref}
        onClick={onClick}
        {...rest}>
        {icon}
      </Mantine.ActionIcon>
    );
  }

  return (
    <Mantine.Button className={className} ref={ref} onClick={onClick} {...rest}>
      {children}
    </Mantine.Button>
  );
});
