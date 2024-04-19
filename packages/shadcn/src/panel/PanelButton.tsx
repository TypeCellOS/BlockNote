import * as ShadCNButton from "../components/ui/button";

import { ComponentProps } from "@blocknote/react";

export const PanelButton = (
  props: ComponentProps["ImagePanel"]["Button"] &
    Partial<{
      Button: typeof ShadCNButton.Button;
    }>
) => {
  const { className, children, onClick } = props;

  const Button = props.Button || ShadCNButton.Button;

  return (
    <Button variant={"outline"} className={className} onClick={onClick}>
      {children}
    </Button>
  );
};
