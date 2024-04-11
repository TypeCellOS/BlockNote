import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";

export const PanelButton = (props: ComponentProps["ImagePanel"]["Button"]) => {
  const { className, children, ...rest } = props;

  return (
    <Ariakit.Button className={className} {...rest}>
      {children}
    </Ariakit.Button>
  );
};
