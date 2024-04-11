import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { ComponentProps } from "@blocknote/react";

export const PanelButton = (props: ComponentProps["ImagePanel"]["Button"]) => {
  const { children, className, ...rest } = props;

  return (
    <Button className={cn("w-64", className)} variant={"outline"} {...rest}>
      {children}
    </Button>
  );
};
