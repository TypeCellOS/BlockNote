import * as Ariakit from "@ariakit/react";

import { mergeCSSClasses } from "@blocknote/core";
import { PanelButtonProps } from "@blocknote/react";

export const PanelButton = (props: PanelButtonProps) => {
  const { children, className, ...rest } = props;

  return (
    <Ariakit.Button
      className={mergeCSSClasses("button", className || "")}
      {...rest}>
      {children}
    </Ariakit.Button>
  );
};
