import * as ShadCNButton from "../components/ui/button";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

export const PanelButton = forwardRef<
  HTMLButtonElement,
  ComponentProps["ImagePanel"]["Button"]
>((props, ref) => {
  const { className, children, onClick } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const Button = ShadCNComponents?.Button || ShadCNButton.Button;

  return (
    <Button
      variant={"outline"}
      className={className}
      ref={ref}
      onClick={onClick}>
      {children}
    </Button>
  );
});
