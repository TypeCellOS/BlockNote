import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

export const PanelButton = (props: ComponentProps["ImagePanel"]["Button"]) => {
  const { className, children, onClick } = props;

  return (
    <Mantine.Button size={"xs"} className={className} onClick={onClick}>
      {children}
    </Mantine.Button>
  );
};
