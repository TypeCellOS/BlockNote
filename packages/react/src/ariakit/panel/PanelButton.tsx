import * as Ariakit from "@ariakit/react";

import { PanelButtonProps } from "../../editor/ComponentsContext";
import { mergeCSSClasses } from "@blocknote/core";

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
