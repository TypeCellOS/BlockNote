import * as ShadCNButton from "../components/ui/button";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";
import { cn } from "../lib/utils";

export const SideMenuButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["SideMenu"]["Button"]
>((props, ref) => {
  const { className, children, icon, onClick, ...rest } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const Button = ShadCNComponents?.Button || ShadCNButton.Button;

  return (
    <Button
      variant={"ghost"}
      className={cn(className, "text-gray-400")}
      ref={ref}
      onClick={onClick}
      {...rest}>
      {icon}
      {children}
    </Button>
  );
});
