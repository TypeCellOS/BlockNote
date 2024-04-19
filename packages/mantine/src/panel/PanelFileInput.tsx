import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

export const PanelFileInput = (
  props: ComponentProps["ImagePanel"]["FileInput"]
) => {
  const { className, value, placeholder, onChange } = props;

  return (
    <Mantine.FileInput
      size={"xs"}
      className={className}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
    />
  );
};
