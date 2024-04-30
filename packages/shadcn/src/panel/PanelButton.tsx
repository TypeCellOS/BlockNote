import { PanelButtonProps } from "../../../react/src";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

export const PanelButton = (props: PanelButtonProps) => {
  const { children, className, ...rest } = props;

  return (
    <Button className={cn("w-64", className)} variant={"outline"} {...rest}>
      {children}
    </Button>
  );
};
