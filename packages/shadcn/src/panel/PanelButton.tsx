import * as ShadCNButton from "../components/ui/button";
import { ComponentProps } from "@blocknote/react";

export const PanelButton = (
  props: ComponentProps["ImagePanel"]["Button"] &
    Partial<{
      Button: typeof ShadCNButton.Button;
    }>
) => {
  const Button = props.Button || ShadCNButton.Button;

  const { children, className, ...rest } = props;

  return (
    <Button variant={"outline"} {...rest}>
      {children}
    </Button>
  );
};
