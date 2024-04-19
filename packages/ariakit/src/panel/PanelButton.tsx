import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";
import { mergeCSSClasses } from "@blocknote/core";

export const PanelButton = (props: ComponentProps["ImagePanel"]["Button"]) => {
  const { className, children, onClick } = props;

  return (
    <Ariakit.Button
      className={mergeCSSClasses("button", className || "")}
      onClick={onClick}>
      {children}
    </Ariakit.Button>
  );
};
