import * as Ariakit from "@ariakit/react";

import { mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const SideMenuButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["SideMenu"]["Button"]
>((props, ref) => {
  const { className, children, icon, onClick } = props;

  return (
    <Ariakit.Button
      className={mergeCSSClasses(
        "bn-ak-button bn-ak-secondary",
        className || ""
      )}
      ref={ref}
      onClick={onClick}>
      {icon}
      {children}
    </Ariakit.Button>
  );
});
