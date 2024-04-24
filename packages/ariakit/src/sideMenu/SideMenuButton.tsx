import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SideMenuButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["SideMenu"]["Button"]
>((props, ref) => {
  const { className, children, icon, onClick } = props;

  return (
    <Ariakit.Button className={className} ref={ref} onClick={onClick}>
      {icon}
      {children}
    </Ariakit.Button>
  );
});
