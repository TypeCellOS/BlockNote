import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

export const PanelTextInput = (
  props: ComponentProps["ImagePanel"]["TextInput"]
) => {
  const { className, value, placeholder, onKeyDown, onChange } = props;

  return (
    <Mantine.TextInput
      size={"xs"}
      data-test={"embed-input"}
      className={className}
      value={value}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onChange={onChange}
    />
  );
};
