import * as ShadCNButton from "../components/ui/button";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

export const SideMenuButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["SideMenu"]["Button"]
>((props, ref) => {
  const { className, children, icon, onClick } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const Button = ShadCNComponents?.Button || ShadCNButton.Button;

  return (
    <Button className={className} ref={ref} onClick={onClick}>
      {icon}
      {children}
    </Button>
  );
});
